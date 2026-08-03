import { useEffect, useRef } from "react";
import { buildLastShowSession } from "../session/buildLastShowSession";
import {
  loadLastShowSession,
  saveLastShowSession,
} from "../session/lastShowStorage";
import type { LastShowSession } from "../types/lastShowSession";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";

const SAVE_DEBOUNCE_MS = 800;

interface UseLastShowPersistenceOptions {
  showInfo: ShowInfo;
  autoAdvance: boolean;
  defaultCueDuration: number;
  playlist: Song[];
  activeSongIndex: number;
  currentTime: number;
  timelineZoom: number;
  getMediaDirectoryPath: () => string | undefined;
  getShowFilePath: () => string | undefined;
  onRestore: (
    session: LastShowSession,
  ) => Promise<{ timelineZoom: number } | null>;
}

function buildSessionSnapshot(
  options: UseLastShowPersistenceOptions,
): LastShowSession {
  return buildLastShowSession({
    showInfo: options.showInfo,
    autoAdvance: options.autoAdvance,
    defaultCueDuration: options.defaultCueDuration,
    playlist: options.playlist,
    activeSongIndex: options.activeSongIndex,
    currentTime: options.currentTime,
    timelineZoom: options.timelineZoom,
    mediaDirectoryPath: options.getMediaDirectoryPath(),
    showFilePath: options.getShowFilePath(),
  });
}

export function useLastShowPersistence(
  options: UseLastShowPersistenceOptions,
): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const persistenceEnabledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = await loadLastShowSession();
      if (cancelled) return;

      if (session) {
        await optionsRef.current.onRestore(session);
      }

      if (!cancelled) {
        persistenceEnabledRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistenceEnabledRef.current) return;
    if (options.playlist.length === 0) return;

    const timeout = window.setTimeout(() => {
      void saveLastShowSession(buildSessionSnapshot(optionsRef.current));
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [
    options.showInfo,
    options.autoAdvance,
    options.defaultCueDuration,
    options.playlist,
    options.activeSongIndex,
    options.currentTime,
    options.timelineZoom,
  ]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!persistenceEnabledRef.current) return;
      if (optionsRef.current.playlist.length === 0) return;

      void saveLastShowSession(buildSessionSnapshot(optionsRef.current));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
