import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CUE_RAIL_SPLIT_STORAGE_KEY,
  DEFAULT_PANEL_LAYOUT,
  EDITOR_LAYOUT_STORAGE_KEY,
  PANEL_LAYOUT_STORAGE_KEY,
  PANEL_LIMITS,
} from "../constants/panelLayout";

export interface PanelLayout {
  playlistWidth: number;
  cueRailWidth: number;
  directorWidth: number;
}

type ResizeTarget = "playlist" | "cueRail" | "director";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getCueRailWidthBounds(
  containerWidth: number,
  playlistWidth: number,
): { min: number; max: number } {
  const available = containerWidth - playlistWidth - PANEL_LIMITS.mainMin;
  const min = PANEL_LIMITS.director.min + PANEL_LIMITS.cueSheet.min;
  const max = Math.max(min, available);

  return { min, max };
}

/** Keep cue sheet within 420–960px; NOW/director keeps priority when space is tight. */
export function clampDirectorWidth(
  cueRailWidth: number,
  directorWidth: number,
): number {
  const maxDirector = cueRailWidth - PANEL_LIMITS.cueSheet.min;
  const minDirector = Math.max(
    PANEL_LIMITS.director.min,
    cueRailWidth - PANEL_LIMITS.cueSheet.max,
  );

  return clamp(directorWidth, minDirector, maxDirector);
}

function getCueSheetWidth(cueRailWidth: number, directorWidth: number): number {
  return cueRailWidth - clampDirectorWidth(cueRailWidth, directorWidth);
}

/**
 * When the cue rail width changes, shrink/grow the cue sheet first.
 * NOW/director width is preserved until the sheet hits its minimum.
 */
function adjustDirectorOnCueRailResize(
  previousCueRailWidth: number,
  nextCueRailWidth: number,
  directorWidth: number,
): number {
  const previousSheet = previousCueRailWidth - directorWidth;
  const delta = nextCueRailWidth - previousCueRailWidth;

  if (delta === 0) {
    return clampDirectorWidth(nextCueRailWidth, directorWidth);
  }

  if (delta > 0) {
    const sheetHeadroom = PANEL_LIMITS.cueSheet.max - previousSheet;
    const sheetGain = Math.min(delta, Math.max(0, sheetHeadroom));
    return clampDirectorWidth(
      nextCueRailWidth,
      directorWidth + (delta - sheetGain),
    );
  }

  const shrink = -delta;
  const sheetCanLose = Math.max(0, previousSheet - PANEL_LIMITS.cueSheet.min);
  const sheetLoss = Math.min(shrink, sheetCanLose);
  const directorLoss = shrink - sheetLoss;

  return clampDirectorWidth(
    nextCueRailWidth,
    directorWidth - directorLoss,
  );
}

function clampPanelLayout(
  layout: PanelLayout,
  containerWidth: number,
): PanelLayout {
  const playlistWidth = clamp(
    layout.playlistWidth,
    PANEL_LIMITS.playlist.min,
    PANEL_LIMITS.playlist.max,
  );

  const { min: cueRailMin, max: cueRailMax } = getCueRailWidthBounds(
    Math.max(containerWidth, PANEL_LIMITS.mainMin),
    playlistWidth,
  );

  const cueRailWidth = clamp(
    layout.cueRailWidth,
    cueRailMin,
    cueRailMax,
  );

  const directorWidth = clampDirectorWidth(
    cueRailWidth,
    layout.directorWidth,
  );

  return { playlistWidth, cueRailWidth, directorWidth };
}

function loadStoredPanelLayout(): PanelLayout {
  const fallback: PanelLayout = { ...DEFAULT_PANEL_LAYOUT };

  try {
    const raw = localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PanelLayout>;
      return clampPanelLayout(
        {
          playlistWidth:
            typeof parsed.playlistWidth === "number"
              ? parsed.playlistWidth
              : fallback.playlistWidth,
          cueRailWidth:
            typeof parsed.cueRailWidth === "number"
              ? parsed.cueRailWidth
              : fallback.cueRailWidth,
          directorWidth:
            typeof parsed.directorWidth === "number"
              ? parsed.directorWidth
              : fallback.directorWidth,
        },
        window.innerWidth,
      );
    }

    const legacyEditor = localStorage.getItem(EDITOR_LAYOUT_STORAGE_KEY);
    const legacySplit = localStorage.getItem(CUE_RAIL_SPLIT_STORAGE_KEY);

    let migrated = { ...fallback };

    if (legacyEditor) {
      const parsed = JSON.parse(legacyEditor) as Partial<PanelLayout>;
      if (typeof parsed.playlistWidth === "number") {
        migrated.playlistWidth = parsed.playlistWidth;
      }
      if (typeof parsed.cueRailWidth === "number") {
        migrated.cueRailWidth = parsed.cueRailWidth;
      }
    }

    if (legacySplit) {
      const parsed = JSON.parse(legacySplit) as { directorWidth?: number };
      if (typeof parsed.directorWidth === "number") {
        migrated.directorWidth = parsed.directorWidth;
      }
    }

    return clampPanelLayout(migrated, window.innerWidth);
  } catch {
    return clampPanelLayout(fallback, window.innerWidth);
  }
}

/** Resizable panel layout — always available in Live and Editor modes. */
export function usePanelLayout(
  containerRef: RefObject<HTMLElement | null>,
) {
  const [layout, setLayout] = useState<PanelLayout>(loadStoredPanelLayout);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const dragRef = useRef<{
    target: ResizeTarget;
    startX: number;
    startLayout: PanelLayout;
  } | null>(null);

  const getContainerWidth = useCallback(() => {
    const width = containerRef.current?.clientWidth ?? window.innerWidth;
    return Math.max(width, PANEL_LIMITS.mainMin);
  }, [containerRef]);

  const applyLayout = useCallback(
    (next: PanelLayout) => {
      const clamped = clampPanelLayout(next, getContainerWidth());
      layoutRef.current = clamped;
      setLayout(clamped);
    },
    [getContainerWidth],
  );

  useEffect(() => {
    localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  useEffect(() => {
    const handleResize = () => {
      applyLayout(layoutRef.current);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyLayout]);

  const finishDrag = useCallback(() => {
    dragRef.current = null;
    document.body.classList.remove("is-resizing-panels");
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const delta = event.clientX - drag.startX;
      const containerWidth = getContainerWidth();
      const { min: cueRailMin, max: cueRailMax } = getCueRailWidthBounds(
        containerWidth,
        drag.startLayout.playlistWidth,
      );
      const { startLayout } = drag;

      if (drag.target === "playlist") {
        const nextPlaylist = clamp(
          startLayout.playlistWidth + delta,
          PANEL_LIMITS.playlist.min,
          PANEL_LIMITS.playlist.max,
        );

        applyLayout(
          clampPanelLayout(
            { ...startLayout, playlistWidth: nextPlaylist },
            containerWidth,
          ),
        );
        return;
      }

      if (drag.target === "cueRail") {
        const nextCueRail = clamp(
          startLayout.cueRailWidth - delta,
          cueRailMin,
          cueRailMax,
        );

        applyLayout({
          ...startLayout,
          cueRailWidth: nextCueRail,
          directorWidth: adjustDirectorOnCueRailResize(
            startLayout.cueRailWidth,
            nextCueRail,
            startLayout.directorWidth,
          ),
        });
        return;
      }

      if (drag.target === "director") {
        applyLayout({
          ...startLayout,
          directorWidth: clampDirectorWidth(
            startLayout.cueRailWidth,
            startLayout.directorWidth + delta,
          ),
        });
      }
    },
    [applyLayout, getContainerWidth],
  );

  useEffect(() => {
    const handlePointerUp = () => finishDrag();

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, finishDrag]);

  const startResize = useCallback(
    (target: ResizeTarget) => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragRef.current = {
        target,
        startX: event.clientX,
        startLayout: layoutRef.current,
      };
      document.body.classList.add("is-resizing-panels");
    },
    [],
  );

  const cueSheetWidth = getCueSheetWidth(
    layout.cueRailWidth,
    layout.directorWidth,
  );

  return {
    playlistWidth: layout.playlistWidth,
    cueRailWidth: layout.cueRailWidth,
    directorWidth: layout.directorWidth,
    cueSheetWidth,
    onPlaylistResizeStart: startResize("playlist"),
    onCueRailResizeStart: startResize("cueRail"),
    onDirectorResizeStart: startResize("director"),
  };
}
