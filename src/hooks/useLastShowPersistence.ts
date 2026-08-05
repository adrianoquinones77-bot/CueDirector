import { useEffect, useRef } from "react";
import {
  getPlaybackTime,
  subscribePlaybackTime,
} from "../playback/playbackClock";
import { buildLastShowSession } from "../session/buildLastShowSession";
import {
  buildPlaybackPosition,
  loadLastShowPlaybackPosition,
  saveLastShowPlaybackPosition,
} from "../session/lastShowPlaybackPositionStorage";
import {
  loadLastShowSession,
  saveLastShowSession,
} from "../session/lastShowStorage";
import type { LastShowSession } from "../types/lastShowSession";
import type { RuntimeShowMediaItem } from "../types/showMedia";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";

const SAVE_DEBOUNCE_MS = 800;

interface UseLastShowPersistenceOptions {
  showInfo: ShowInfo;
  autoAdvance: boolean;
  defaultCueDuration: number;
  playlist: Song[];
  mediaLibrary: RuntimeShowMediaItem[];
  activeSongIndex: number;
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
    mediaLibrary: options.mediaLibrary,
    activeSongIndex: options.activeSongIndex,
    currentTime: getPlaybackTime(),
    timelineZoom: options.timelineZoom,
    mediaDirectoryPath: options.getMediaDirectoryPath(),
    showFilePath: options.getShowFilePath(),
  });
}

function buildPositionSnapshot(
  options: UseLastShowPersistenceOptions,
) {
  return buildPlaybackPosition(options.activeSongIndex, getPlaybackTime());
}

async function persistPlaybackPosition(
  options: UseLastShowPersistenceOptions,
): Promise<void> {
  await saveLastShowPlaybackPosition(buildPositionSnapshot(options));
}

async function persistFullShow(
  options: UseLastShowPersistenceOptions,
): Promise<void> {
  const session = buildSessionSnapshot(options);
  await saveLastShowSession(session);
  await saveLastShowPlaybackPosition(
    buildPlaybackPosition(session.activeSongIndex, session.currentTime),
  );
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
      const [session, position] = await Promise.all([
        loadLastShowSession(),
        loadLastShowPlaybackPosition(),
      ]);
      if (cancelled) return;

      if (session) {
        const restored: LastShowSession = position
          ? {
              ...session,
              activeSongIndex: position.activeSongIndex,
              currentTime: position.currentTime,
            }
          : session;

        await optionsRef.current.onRestore(restored);
      }

      if (!cancelled) {
        persistenceEnabledRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Full show serialization only when structure / metadata changes.
  useEffect(() => {
    if (!persistenceEnabledRef.current) return;
    if (options.playlist.length === 0) return;

    const timeout = window.setTimeout(() => {
      void persistFullShow(optionsRef.current);
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [
    options.showInfo,
    options.autoAdvance,
    options.defaultCueDuration,
    options.playlist,
    options.mediaLibrary,
    options.timelineZoom,
  ]);

  // Lightweight playhead + active song — never rebuilds the show document.
  useEffect(() => {
    if (options.playlist.length === 0) return;

    let timeout = 0;
    const schedulePositionSave = () => {
      if (!persistenceEnabledRef.current) return;
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        void persistPlaybackPosition(optionsRef.current);
      }, SAVE_DEBOUNCE_MS);
    };

    schedulePositionSave();
    const unsubscribe = subscribePlaybackTime(schedulePositionSave);

    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [options.playlist.length, options.activeSongIndex]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!persistenceEnabledRef.current) return;
      if (optionsRef.current.playlist.length === 0) return;

      void persistFullShow(optionsRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}
