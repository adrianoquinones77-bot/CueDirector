import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { Cue } from "../types/cue";
import { useLiveCountdown } from "../hooks/useLiveCountdown";
import { usePlaybackTime } from "../playback/playbackClock";
import ResizeHandle from "./ResizeHandle";
import type { VideoPlayerHandle } from "./VideoPlayer";
import {
  getCueEndTime,
  getLivePeriodStart,
  isCueActive,
} from "../utils/cueTiming";
import { getCueDisplayIcon } from "../utils/cueEmoji";
import { getCueLabel } from "../utils/formatCueText";
import { getCueWindow } from "../utils/getCueWindow";
import { blockArrowKeyFocusNavigation } from "../hooks/useVideoSeekShortcuts";
import AdaptiveCueText from "./AdaptiveCueText";
import ShowTimer from "./ShowTimer";

interface CuePanelProps {
  cues: Cue[];
  defaultCueDuration: number;
  onCueSeek: (time: number, cue: Cue) => void;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
  directorMode: boolean;
  editorMode: boolean;
  width: number;
  directorWidth: number;
  cueSheetWidth: number;
  onDirectorResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onEditCue: (index: number) => void;
  selectedCueIndex: number | null;
  onSelectCue: (index: number) => void;
  onCueContextMenu: (index: number, event: React.MouseEvent) => void;
  onToggleImportant: (index: number) => void;
}

type CueRowVariant = "past" | "current" | "next" | "future";
type CueSheetTab = "all" | "important";

const USER_SCROLL_PAUSE_MS = 2000;
const LIVE_LABEL = "LIVE";

interface CueSheetIndices {
  currentIndex: number;
  nextIndex: number;
}

interface CueSheetEntry {
  cue: Cue;
  index: number;
}

function getCueSheetIndices(
  cues: Cue[],
  currentTime: number,
  defaultCueDuration: number,
): CueSheetIndices {
  const currentIndex = cues.findIndex((cue) =>
    isCueActive(cue, currentTime, defaultCueDuration),
  );

  if (currentIndex >= 0) {
    const nextIndex =
      currentIndex + 1 < cues.length ? currentIndex + 1 : -1;
    return { currentIndex, nextIndex };
  }

  const nextIndex = cues.findIndex((cue) => cue.time > currentTime);
  return { currentIndex: -1, nextIndex };
}

function getCueSheetRowVariant(
  index: number,
  cue: Cue,
  indices: CueSheetIndices,
  currentTime: number,
  defaultCueDuration: number,
): CueRowVariant {
  const { currentIndex, nextIndex } = indices;

  if (index === currentIndex) return "current";
  if (index === nextIndex) return "next";

  if (currentIndex >= 0) {
    return index < currentIndex ? "past" : "future";
  }

  if (currentTime >= getCueEndTime(cue, defaultCueDuration)) return "past";
  return "future";
}

function getNextCueProgress(
  cues: Cue[],
  current: Cue | undefined,
  next: Cue | undefined,
  currentTime: number,
  defaultCueDuration: number,
): number {
  if (!next) return 0;

  const windowStart = current
    ? current.time
    : getLivePeriodStart(cues, currentTime, defaultCueDuration);
  const total = next.time - windowStart;
  if (total <= 0) return 0;

  const remaining = Math.max(0, next.time - currentTime);
  return (remaining / total) * 100;
}

function getRowIcon(variant: CueRowVariant): string {
  if (variant === "past") return "✓";
  if (variant === "current") return "▶";
  if (variant === "next") return "→";
  return "";
}

function formatCueSheetTime(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function DirectorCueDisplay({
  cue,
  text,
  className,
}: {
  cue?: Cue;
  text?: string;
  className: string;
}) {
  if (!text) {
    return (
      <div className={`cue-display ${className}`}>
        <AdaptiveCueText text="--" />
      </div>
    );
  }

  const icon = cue ? getCueDisplayIcon(cue) : null;
  const label = getCueLabel(text);
  const isImportant = cue?.important === true;

  return (
    <div
      className={`cue-display ${className}${isImportant ? " cue-display--important" : ""}`}
    >
      {isImportant && (
        <span className="cue-display__important" aria-hidden="true">
          ⭐
        </span>
      )}
      {icon && (
        <span className="cue-display__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <AdaptiveCueText text={label} />
    </div>
  );
}

function getNowDisplayText(
  current: Cue | undefined,
  cues: Cue[],
): string | undefined {
  if (current) return current.text;
  if (cues.length === 0) return undefined;
  return LIVE_LABEL;
}

function CuePanel({
  cues,
  defaultCueDuration,
  onCueSeek,
  videoPlayerRef,
  directorMode,
  editorMode,
  width,
  directorWidth,
  cueSheetWidth,
  onDirectorResizeStart,
  onEditCue,
  selectedCueIndex,
  onSelectCue,
  onCueContextMenu,
  onToggleImportant,
}: CuePanelProps) {
  const currentTime = usePlaybackTime();
  const { current, next } = getCueWindow(cues, currentTime, defaultCueDuration);
  const cueSheetIndices = getCueSheetIndices(
    cues,
    currentTime,
    defaultCueDuration,
  );
  const nowText = getNowDisplayText(current, cues);
  const [sheetTab, setSheetTab] = useState<CueSheetTab>("all");
  const computeNextCueProgress = useCallback(
    (time: number) =>
      getNextCueProgress(cues, current, next, time, defaultCueDuration),
    [cues, current, next, defaultCueDuration],
  );
  const computeRemaining = useCallback(
    (time: number) => (next ? Math.max(0, next.time - time) : 0),
    [next],
  );
  const getPlayback = useCallback(
    () => {
      const player = videoPlayerRef.current;
      if (!player) return null;
      return {
        currentTime: player.getCurrentTime(),
        paused: player.isPaused(),
      };
    },
    [videoPlayerRef],
  );
  const countdownProgressKey = `${current?.time ?? "live"}:${next?.time ?? "none"}`;
  const {
    displayRemaining: countdownRemaining,
    progress: countdownProgress,
    isPlaying: countdownPlaying,
  } = useLiveCountdown(
      computeNextCueProgress,
      computeRemaining,
      currentTime,
      Boolean(next),
      countdownProgressKey,
      getPlayback,
    );
  const currentRowRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const userScrollingRef = useRef(false);

  const sheetEntries = useMemo<CueSheetEntry[]>(() => {
    if (sheetTab === "all") {
      return cues.map((cue, index) => ({ cue, index }));
    }

    return cues
      .map((cue, index) => ({ cue, index }))
      .filter((entry) => entry.cue.important === true);
  }, [cues, sheetTab]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let resumeTimeout = 0;

    const handleScroll = () => {
      userScrollingRef.current = true;
      window.clearTimeout(resumeTimeout);
      resumeTimeout = window.setTimeout(() => {
        userScrollingRef.current = false;
      }, USER_SCROLL_PAUSE_MS);
    };

    list.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      list.removeEventListener("scroll", handleScroll);
      window.clearTimeout(resumeTimeout);
    };
  }, [sheetTab]);

  useEffect(() => {
    if (userScrollingRef.current) return;
    if (sheetTab !== "all") return;

    currentRowRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [current?.time, sheetTab]);

  return (
    <aside
      className={`cue-rail${editorMode ? " cue-rail--editor" : " cue-rail--live"}`}
      style={{ width, flex: `0 0 ${width}px` }}
    >
      <div
        className="cue-director"
        style={{ width: directorWidth, flex: `0 0 ${directorWidth}px` }}
      >
        <section className="cue-section cue-section--now">
          <h2 className="cue-section__title">NOW</h2>
          <div
            className={`cue-broadcast-card cue-broadcast-card--now${
              current?.important ? " cue-broadcast-card--important" : ""
            }`}
          >
            <DirectorCueDisplay
              cue={current}
              text={nowText}
              className={`cue current${!current ? " cue--live" : ""}`}
            />
          </div>
        </section>

        <div className="cue-divider" role="separator" />

        <section className="cue-section cue-section--next">
          <h2 className="cue-section__title">NEXT</h2>
          <div
            className={`cue-broadcast-card cue-broadcast-card--next${
              next?.important ? " cue-broadcast-card--important" : ""
            }`}
          >
            <DirectorCueDisplay cue={next} text={next?.text} className="cue next" />
          </div>
          <div
            className={`cue-countdown${next ? " cue-countdown--active" : ""}`}
          >
            {next
              ? `in ${countdownRemaining.toFixed(1)} s`
              : "No upcoming cue"}
          </div>
          {next && (
            <div className="cue-countdown-progress" aria-hidden="true">
              <div
                className={`cue-countdown-progress__fill${countdownPlaying ? "" : " cue-countdown-progress__fill--snap"}`}
                style={{ width: `${countdownProgress}%` }}
              />
            </div>
          )}
        </section>
      </div>

      <ResizeHandle
        ariaLabel="Resize NOW/NEXT and cue sheet panels"
        onPointerDown={onDirectorResizeStart}
      />

      <section
        className="cue-sheet-panel"
        style={{ width: cueSheetWidth, flex: `1 1 ${cueSheetWidth}px` }}
      >
        <div className="cue-sheet-header">
          <h2 className="cue-section__title">CUE SHEET</h2>
          <div className="cue-sheet-tabs" role="tablist" aria-label="Cue sheet views">
            <button
              type="button"
              role="tab"
              aria-selected={sheetTab === "all"}
              className={`cue-sheet-tab${sheetTab === "all" ? " cue-sheet-tab--active" : ""}`}
              onClick={() => setSheetTab("all")}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sheetTab === "important"}
              className={`cue-sheet-tab${sheetTab === "important" ? " cue-sheet-tab--active" : ""}`}
              onClick={() => setSheetTab("important")}
            >
              ⭐ Important
            </button>
          </div>
        </div>

        {sheetTab === "important" && sheetEntries.length === 0 ? (
          <p className="cue-sheet-empty">No Important Cues</p>
        ) : (
          <ul
            ref={listRef}
            className="cue-sheet-list"
            aria-label={sheetTab === "important" ? "Important cues" : "Cue sheet"}
            onKeyDown={blockArrowKeyFocusNavigation}
          >
            {sheetEntries.map(({ cue, index }) => {
              const variant = getCueSheetRowVariant(
                index,
                cue,
                cueSheetIndices,
                currentTime,
                defaultCueDuration,
              );
              const isCurrent = variant === "current";
              const isSelected = editorMode && selectedCueIndex === index;
              const isImportant = cue.important === true;

              return (
                <li
                  key={`${cue.time}-${index}-${cue.text}`}
                  ref={isCurrent && sheetTab === "all" ? currentRowRef : undefined}
                  className={`cue-sheet-item cue-sheet-item--${variant}${
                    isSelected ? " cue-sheet-item--selected" : ""
                  }${isImportant ? " cue-sheet-item--important" : ""}`}
                >
                  <button
                    type="button"
                    className="cue-sheet-item__button"
                    disabled={directorMode}
                    onClick={() => {
                      if (editorMode) {
                        onSelectCue(index);
                      }
                      if (!directorMode) {
                        onCueSeek(cue.time, cue);
                      }
                    }}
                    onDoubleClick={() => {
                      if (directorMode) return;
                      onCueSeek(cue.time, cue);
                    }}
                    onKeyDown={blockArrowKeyFocusNavigation}
                    onContextMenu={(event) => {
                      if (!editorMode) return;
                      event.preventDefault();
                      onSelectCue(index);
                      onCueContextMenu(index, event);
                    }}
                  >
                    <span className="cue-sheet-item__icon" aria-hidden="true">
                      {getRowIcon(variant)}
                    </span>
                    <span className="cue-sheet-item__time">
                      {formatCueSheetTime(cue.time)}
                    </span>
                    <span className="cue-sheet-item__emoji" aria-hidden="true">
                      {getCueDisplayIcon(cue)}
                    </span>
                    <span className="cue-sheet-item__name">
                      {isImportant && (
                        <span
                          className="cue-sheet-item__star"
                          aria-label="Important cue"
                        >
                          ⭐
                        </span>
                      )}
                      {getCueLabel(cue.text)}
                    </span>
                  </button>

                  {editorMode && (
                    <button
                      type="button"
                      className={`cue-sheet-item__important-toggle${
                        isImportant
                          ? " cue-sheet-item__important-toggle--active"
                          : ""
                      }`}
                      aria-label={
                        isImportant
                          ? `Unmark ${getCueLabel(cue.text)} as important`
                          : `Mark ${getCueLabel(cue.text)} as important`
                      }
                      aria-pressed={isImportant}
                      onClick={() => onToggleImportant(index)}
                    >
                      ⭐
                    </button>
                  )}

                  {editorMode && (
                    <button
                      type="button"
                      className="cue-sheet-item__edit"
                      aria-label={`Edit cue ${getCueLabel(cue.text)}`}
                      onClick={() => onEditCue(index)}
                    >
                      Edit
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <ShowTimer />
      </section>
    </aside>
  );
}

export default memo(CuePanel);
