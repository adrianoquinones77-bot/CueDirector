import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { buildPlaylistFromFiles, revokePlaylistUrls } from "../buildPlaylist";
import { createCueFileHandleRegistry } from "../cueFile/cueFileHandleRegistry";
import {
  createSongCueFile,
  downloadSongCueFile,
  getSaveCueErrorMessage,
  updateSongCueFile,
} from "../cueFile/persistCueFile";
import { demoCues } from "../demoCues";
import {
  buildPlaylistFromDirectory,
  pickMediaDirectory,
} from "../media/loadMediaDirectory";
import {
  collectVideosFromDirectoryHandle,
  collectVideosFromFileList,
  indexVideosByFilename,
  pickMediaFolderViaInput,
  relinkMissingVideos,
} from "../media/relinkMedia";
import { clearLastShowSession } from "../session/lastShowStorage";
import { parseCueDirectorFile } from "../showFile/parseCueDirectorFile";
import { logShowRestore, deriveMediaDirectoryFromFiles } from "../showFile/showMediaPaths";
import {
  buildPlaylistFromElectronDirectory,
  restoreShowFromElectronDirectory,
  tryRestoreElectronShow,
} from "../showFile/restoreShowFromElectron";
import {
  restoreShowFromDirectory,
  restoreShowFromFile,
  type RestoreShowResult,
} from "../showFile/restoreShowFile";
import { downloadShowFile, writeShowFileToPath } from "../showFile/saveShowFile";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import type { Cue } from "../types/cue";
import type { LastShowSession } from "../types/lastShowSession";
import { defaultShowInfo, type ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";
import { DEFAULT_CUE_DURATION } from "../utils/cueTiming";

function sortCues(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.time - b.time);
}

export function useShowDirector() {
  const [currentTime, setCurrentTime] = useState(0);
  const [cues, setCues] = useState<Cue[]>(demoCues);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [activeSongIndex, setActiveSongIndex] = useState(-1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [directorMode, setDirectorModeState] = useState(false);
  const [editorMode, setEditorModeState] = useState(false);
  const [showInfo, setShowInfo] = useState<ShowInfo>(defaultShowInfo);
  const [defaultCueDuration, setDefaultCueDuration] = useState(
    DEFAULT_CUE_DURATION,
  );
  const [missingVideoFiles, setMissingVideoFiles] = useState<string[]>([]);
  const [openShowError, setOpenShowError] = useState<string | null>(null);
  const [saveCueError, setSaveCueError] = useState<string | null>(null);
  const pendingShowRef = useRef<CueDirectorFile | null>(null);
  const mediaDirectoryRef = useRef<FileSystemDirectoryHandle | null>(null);
  const mediaDirectoryPathRef = useRef<string | undefined>(undefined);
  const showFilePathRef = useRef<string | undefined>(undefined);
  const cueFileHandlesRef = useRef(createCueFileHandleRegistry());

  const activeSong = activeSongIndex >= 0 ? playlist[activeSongIndex] : undefined;
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  const selectSong = useCallback(
    (index: number) => {
      const song = playlist[index];
      if (!song) return;

      setActiveSongIndex(index);
      setCues(song.cues);
      setCurrentTime(0);
    },
    [playlist],
  );

  useEffect(() => {
    return () => revokePlaylistUrls(playlistRef.current);
  }, []);

  const applyLoadedPlaylist = useCallback((songs: Song[]) => {
    if (songs.length === 0) return;

    setPlaylist(songs);
    setActiveSongIndex(0);
    setCues(songs[0].cues);
    setCurrentTime(0);
  }, []);

  const loadShowDirectory = useCallback(async () => {
    if (window.electronAPI) {
      const directoryPath = await window.electronAPI.pickMediaDirectory();
      if (!directoryPath) return;

      mediaDirectoryPathRef.current = directoryPath;
      showFilePathRef.current = undefined;
      mediaDirectoryRef.current = null;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const songs = await buildPlaylistFromElectronDirectory(directoryPath);
      applyLoadedPlaylist(songs);
      return;
    }

    const directoryHandle = await pickMediaDirectory();
    if (!directoryHandle) return;

    mediaDirectoryPathRef.current = undefined;
    showFilePathRef.current = undefined;
    mediaDirectoryRef.current = directoryHandle;
    revokePlaylistUrls(playlist);

    const { songs, cuesFileHandles } =
      await buildPlaylistFromDirectory(directoryHandle);
    cueFileHandlesRef.current.replaceAll(cuesFileHandles);
    applyLoadedPlaylist(songs);
  }, [applyLoadedPlaylist, playlist]);

  const loadShow = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      mediaDirectoryRef.current = null;
      mediaDirectoryPathRef.current = undefined;
      showFilePathRef.current = undefined;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const songs = await buildPlaylistFromFiles(files);
      applyLoadedPlaylist(songs);
    },
    [applyLoadedPlaylist, playlist],
  );

  const saveShow = useCallback(
    (timelineZoom: number) => {
      if (playlist.length === 0) return;

      downloadShowFile({
        showInfo,
        autoAdvance,
        defaultCueDuration,
        timelineZoom,
        mediaDirectoryPath: mediaDirectoryPathRef.current,
        playlist,
      });
    },
    [showInfo, autoAdvance, defaultCueDuration, playlist],
  );

  const persistOpenedShowFile = useCallback(
    async (timelineZoom: number, nextPlaylist: Song[]) => {
      if (!showFilePathRef.current) return;

      await writeShowFileToPath(showFilePathRef.current, {
        showInfo,
        autoAdvance,
        defaultCueDuration,
        timelineZoom,
        mediaDirectoryPath: mediaDirectoryPathRef.current,
        playlist: nextPlaylist,
      });
    },
    [showInfo, autoAdvance, defaultCueDuration],
  );

  const updateActiveSongCues = useCallback(
    (updatedCues: Cue[]) => {
      setPlaylist((previous) =>
        previous.map((song, index) =>
          index === activeSongIndex ? { ...song, cues: updatedCues } : song,
        ),
      );
      setCues(updatedCues);
    },
    [activeSongIndex],
  );

  const saveCues = useCallback(async () => {
    if (activeSongIndex < 0) return;

    const song = playlist[activeSongIndex];
    if (!song) return;

    const songWithCues = { ...song, cues: sortCues(cues) };
    const existingHandle = cueFileHandlesRef.current.get(song.id);

    setSaveCueError(null);

    try {
      if (existingHandle) {
        await updateSongCueFile(songWithCues, existingHandle);
        updateActiveSongCues(songWithCues.cues);
        return;
      }

      let directoryHandle = mediaDirectoryRef.current;
      if (!directoryHandle) {
        directoryHandle = await pickMediaDirectory();
        if (!directoryHandle) {
          downloadSongCueFile(songWithCues);
          return;
        }
        mediaDirectoryRef.current = directoryHandle;
      }

      const handle = await createSongCueFile(songWithCues, directoryHandle);
      cueFileHandlesRef.current.set(song.id, handle);
      updateActiveSongCues(songWithCues.cues);
    } catch (error) {
      try {
        downloadSongCueFile(songWithCues);
        return;
      } catch (fallbackError) {
        setSaveCueError(getSaveCueErrorMessage(fallbackError));
        return;
      }
    }
  }, [activeSongIndex, cues, playlist, updateActiveSongCues]);

  const openShowFile = useCallback(async (file: File): Promise<boolean> => {
    setOpenShowError(null);

    try {
      pendingShowRef.current = parseCueDirectorFile(await file.text());

      const filePath =
        "path" in file && typeof file.path === "string" ? file.path : undefined;
      showFilePathRef.current = filePath;

      logShowRestore("Opened .show file", filePath ?? "(browser upload)");
      logShowRestore(
        "Saved media path from .show",
        pendingShowRef.current.mediaDirectoryPath ?? "(none)",
      );

      return true;
    } catch (error) {
      pendingShowRef.current = null;
      showFilePathRef.current = undefined;
      setOpenShowError(
        error instanceof Error ? error.message : "Invalid show file",
      );
      return false;
    }
  }, []);

  const applyRestoredShow = useCallback(
    (
      result: RestoreShowResult,
      options?: { activeSongIndex?: number; currentTime?: number },
    ): number => {
      setShowInfo(result.showInfo);
      setAutoAdvance(result.preferences.autoAdvance);
      setDefaultCueDuration(result.preferences.defaultCueDuration);
      setPlaylist(result.playlist);
      setMissingVideoFiles(result.missingVideoFiles);

      if (result.playlist.length > 0) {
        const index = Math.min(
          Math.max(0, options?.activeSongIndex ?? 0),
          result.playlist.length - 1,
        );
        setActiveSongIndex(index);
        setCues(result.playlist[index].cues);
        setCurrentTime(options?.currentTime ?? 0);
      } else {
        setActiveSongIndex(-1);
        setCues([]);
        setCurrentTime(0);
      }

      return result.timeline?.zoom ?? 1;
    },
    [],
  );

  const restoreFromSession = useCallback(
    async (session: LastShowSession): Promise<{ timelineZoom: number } | null> => {
      revokePlaylistUrls(playlist);
      mediaDirectoryRef.current = null;
      cueFileHandlesRef.current.clear();
      pendingShowRef.current = null;

      if (window.electronAPI) {
        showFilePathRef.current = session.showFilePath;

        const result = await tryRestoreElectronShow(session.show, {
          showFilePath: session.showFilePath,
          preferredMediaPath:
            session.mediaDirectoryPath ?? session.show.mediaDirectoryPath,
        });

        if (result.mediaDirectoryPath) {
          mediaDirectoryPathRef.current = result.mediaDirectoryPath;
        } else {
          mediaDirectoryPathRef.current = undefined;
        }

        applyRestoredShow(result, {
          activeSongIndex: session.activeSongIndex,
          currentTime: session.currentTime,
        });

        // #region agent log
        fetch("http://127.0.0.1:7662/ingest/2edb04e6-0a86-4d03-b142-8e0cd3b07871", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "6db2d5",
          },
          body: JSON.stringify({
            sessionId: "6db2d5",
            location: "useShowDirector.ts:restoreFromSession",
            message: "session restore applied",
            data: {
              missingVideoFiles: result.missingVideoFiles,
              mediaDirectoryFound: result.mediaDirectoryFound,
              mediaDirectoryPath: result.mediaDirectoryPath,
            },
            timestamp: Date.now(),
            hypothesisId: "H4",
          }),
        }).catch(() => {});
        // #endregion

        return {
          timelineZoom:
            session.timelineZoom ?? session.show.timeline?.zoom ?? 1,
        };
      }

      mediaDirectoryPathRef.current = undefined;
      showFilePathRef.current = undefined;

      const result = await restoreShowFromFile(session.show, []);
      applyRestoredShow(result, {
        activeSongIndex: session.activeSongIndex,
        currentTime: session.currentTime,
      });
      return {
        timelineZoom: session.timelineZoom ?? session.show.timeline?.zoom ?? 1,
      };
    },
    [applyRestoredShow, playlist],
  );

  const clearPersistedShow = useCallback(async () => {
    await clearLastShowSession();
    revokePlaylistUrls(playlist);
    mediaDirectoryRef.current = null;
    mediaDirectoryPathRef.current = undefined;
    showFilePathRef.current = undefined;
    cueFileHandlesRef.current.clear();
    pendingShowRef.current = null;
    setPlaylist([]);
    setActiveSongIndex(-1);
    setCues(demoCues);
    setCurrentTime(0);
    setShowInfo(defaultShowInfo);
    setAutoAdvance(true);
    setDefaultCueDuration(DEFAULT_CUE_DURATION);
    setMissingVideoFiles([]);
  }, [playlist]);

  const getMediaDirectoryPath = useCallback(
    () => mediaDirectoryPathRef.current,
    [],
  );

  const getShowFilePath = useCallback(() => showFilePathRef.current, []);

  const restorePendingShowAtPath = useCallback(
    async (
      mediaDirectoryPath: string,
      pendingShow: CueDirectorFile,
    ): Promise<RestoreShowResult> => {
      mediaDirectoryPathRef.current = mediaDirectoryPath;
      mediaDirectoryRef.current = null;
      revokePlaylistUrls(playlist);
      return restoreShowFromElectronDirectory(pendingShow, mediaDirectoryPath);
    },
    [playlist],
  );

  const tryAutoRestorePendingShow = useCallback(async (): Promise<{
    restored: boolean;
    timelineZoom?: number;
    needsMediaPicker: boolean;
  }> => {
    const pendingShow = pendingShowRef.current;
    if (!pendingShow) {
      return { restored: false, needsMediaPicker: false };
    }

    if (!window.electronAPI) {
      return { restored: false, needsMediaPicker: true };
    }

    const result = await tryRestoreElectronShow(pendingShow, {
      showFilePath: showFilePathRef.current,
      preferredMediaPath: pendingShow.mediaDirectoryPath,
    });

    pendingShowRef.current = null;

    if (result.mediaDirectoryPath) {
      mediaDirectoryPathRef.current = result.mediaDirectoryPath;
    }

    revokePlaylistUrls(playlist);
    const timelineZoom = applyRestoredShow(result);
    const needsMediaPicker =
      result.missingVideoFiles.length > 0 || !result.mediaDirectoryFound;

    if (!needsMediaPicker) {
      await persistOpenedShowFile(timelineZoom, result.playlist);
    }

    return { restored: true, timelineZoom, needsMediaPicker };
  }, [applyRestoredShow, persistOpenedShowFile, playlist]);

  const connectMediaPath = useCallback(
    async (directoryPath: string): Promise<number | undefined> => {
      const pendingShow = pendingShowRef.current;
      pendingShowRef.current = null;

      if (!pendingShow) return undefined;

      const result = await restorePendingShowAtPath(directoryPath, pendingShow);
      const timelineZoom = applyRestoredShow(result);
      await persistOpenedShowFile(timelineZoom, result.playlist);
      return timelineZoom;
    },
    [applyRestoredShow, persistOpenedShowFile, restorePendingShowAtPath],
  );

  const connectMediaDirectory = useCallback(
    async (directoryHandle: FileSystemDirectoryHandle): Promise<number | undefined> => {
      const pendingShow = pendingShowRef.current;
      pendingShowRef.current = null;

      if (!pendingShow) return undefined;

      mediaDirectoryRef.current = directoryHandle;
      revokePlaylistUrls(playlist);

      const result = await restoreShowFromDirectory(pendingShow, directoryHandle);
      cueFileHandlesRef.current.replaceAll(result.cuesFileHandles);
      const timelineZoom = applyRestoredShow(result);
      await persistOpenedShowFile(timelineZoom, result.playlist);
      return timelineZoom;
    },
    [applyRestoredShow, persistOpenedShowFile, playlist],
  );

  const connectMediaFolder = useCallback(
    async (files: FileList): Promise<number | undefined> => {
      const pendingShow = pendingShowRef.current;
      pendingShowRef.current = null;

      if (!pendingShow) return undefined;

      const derivedPath = deriveMediaDirectoryFromFiles(files);
      if (derivedPath) {
        mediaDirectoryPathRef.current = derivedPath;
        logShowRestore("Derived media folder path from selection", derivedPath);
      }

      mediaDirectoryRef.current = null;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const result = await restoreShowFromFile(pendingShow, files);
      const timelineZoom = applyRestoredShow(result);
      await persistOpenedShowFile(timelineZoom, result.playlist);
      return timelineZoom;
    },
    [applyRestoredShow, persistOpenedShowFile, playlist],
  );

  const cancelOpenShow = useCallback(() => {
    pendingShowRef.current = null;
  }, []);

  const dismissMissingVideoFiles = useCallback(() => {
    setMissingVideoFiles([]);
  }, []);

  const relinkMediaFolder = useCallback(
    async (timelineZoom: number) => {
      if (missingVideoFiles.length === 0) return;

      if (window.electronAPI) {
        const directoryPath = await window.electronAPI.pickMediaDirectory();
        if (!directoryPath) return;

        const videos =
          await window.electronAPI.collectVideosRecursively(directoryPath);
        const index = indexVideosByFilename(
          videos.map((video) => ({
            filename: video.name,
            relativePath: video.relativePath.replace(/\\/g, "/"),
            absolutePath: video.absolutePath,
          })),
        );

        const { playlist: nextPlaylist, stillMissing } = await relinkMissingVideos(
          playlist,
          missingVideoFiles,
          index,
          async (location) =>
            window.electronAPI!.pathToFileUrl(location.absolutePath!),
        );

        mediaDirectoryPathRef.current = directoryPath;
        mediaDirectoryRef.current = null;
        setPlaylist(nextPlaylist);
        setMissingVideoFiles(stillMissing);
        await persistOpenedShowFile(timelineZoom, nextPlaylist);
        return;
      }

      let locations = [] as Awaited<
        ReturnType<typeof collectVideosFromDirectoryHandle>
      >;
      const directoryHandle = await pickMediaDirectory();
      if (directoryHandle) {
        mediaDirectoryRef.current = directoryHandle;
        locations = await collectVideosFromDirectoryHandle(directoryHandle);
      } else {
        const files = await pickMediaFolderViaInput();
        if (!files) return;
        locations = collectVideosFromFileList(files);
      }

      const index = indexVideosByFilename(locations);
      const { playlist: nextPlaylist, stillMissing } = await relinkMissingVideos(
        playlist,
        missingVideoFiles,
        index,
        async (location) => URL.createObjectURL(location.file!),
      );

      setPlaylist(nextPlaylist);
      setMissingVideoFiles(stillMissing);
      await persistOpenedShowFile(timelineZoom, nextPlaylist);
    },
    [missingVideoFiles, persistOpenedShowFile, playlist],
  );

  const dismissOpenShowError = useCallback(() => {
    setOpenShowError(null);
  }, []);

  const dismissSaveCueError = useCallback(() => {
    setSaveCueError(null);
  }, []);

  const setDirectorMode = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      setDirectorModeState((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (next) {
          setEditorModeState(false);
        }
        return next;
      });
    },
    [],
  );

  const setEditorMode = useCallback(
    (value: boolean | ((previous: boolean) => boolean)) => {
      setEditorModeState((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (next) {
          setDirectorModeState(false);
        }
        return next;
      });
    },
    [],
  );

  const goToPreviousSong = useCallback(() => {
    if (activeSongIndex > 0) {
      selectSong(activeSongIndex - 1);
    }
  }, [activeSongIndex, selectSong]);

  const goToNextSong = useCallback(() => {
    if (activeSongIndex >= 0 && activeSongIndex < playlist.length - 1) {
      selectSong(activeSongIndex + 1);
    }
  }, [activeSongIndex, playlist.length, selectSong]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const advanceOnVideoEnd = useCallback(() => {
    if (!autoAdvance) return false;
    if (activeSongIndex >= 0 && activeSongIndex < playlist.length - 1) {
      selectSong(activeSongIndex + 1);
      return true;
    }
    return false;
  }, [autoAdvance, activeSongIndex, playlist.length, selectSong]);

  const updateShowInfo = useCallback(
    (field: keyof ShowInfo, value: string) => {
      setShowInfo((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const persistActiveSongCues = useCallback((song: Song, updatedCues: Cue[]) => {
    const handle = cueFileHandlesRef.current.get(song.id);
    if (!handle) return;
    void updateSongCueFile({ ...song, cues: updatedCues }, handle).catch(
      (error) => {
        setSaveCueError(getSaveCueErrorMessage(error));
      },
    );
  }, []);

  const applyActiveSongCues = useCallback(
    (updater: (existing: Cue[]) => Cue[]) => {
      if (activeSongIndex < 0) {
        setCues((previous) => sortCues(updater(previous)));
        return;
      }

      let nextCues: Cue[] | null = null;

      setPlaylist((previous) => {
        const song = previous[activeSongIndex];
        if (!song) return previous;

        nextCues = sortCues(updater(song.cues));
        persistActiveSongCues(song, nextCues);

        return previous.map((entry, index) =>
          index === activeSongIndex ? { ...entry, cues: nextCues! } : entry,
        );
      });

      if (nextCues) {
        setCues(nextCues);
      }
    },
    [activeSongIndex, persistActiveSongCues],
  );

  const addCue = useCallback(
    (cue: Cue) => {
      applyActiveSongCues((existing) => [...existing, cue]);
    },
    [applyActiveSongCues],
  );

  const updateCue = useCallback(
    (index: number, cue: Cue) => {
      applyActiveSongCues((existing) =>
        existing.map((entry, entryIndex) => (entryIndex === index ? cue : entry)),
      );
    },
    [applyActiveSongCues],
  );

  const deleteCue = useCallback(
    (index: number) => {
      applyActiveSongCues((existing) =>
        existing.filter((_, entryIndex) => entryIndex !== index),
      );
    },
    [applyActiveSongCues],
  );

  return {
    currentTime,
    cues,
    playlist,
    activeSongIndex,
    activeVideoSrc: activeSong?.videoUrl || undefined,
    showInfo,
    updateShowInfo,
    autoAdvance,
    setAutoAdvance,
    directorMode,
    setDirectorMode,
    editorMode,
    setEditorMode,
    addCue,
    updateCue,
    deleteCue,
    defaultCueDuration,
    setDefaultCueDuration,
    selectSong,
    loadShow,
    loadShowDirectory,
    saveShow,
    saveCues,
    openShowFile,
    tryAutoRestorePendingShow,
    connectMediaPath,
    connectMediaFolder,
    connectMediaDirectory,
    cancelOpenShow,
    missingVideoFiles,
    dismissMissingVideoFiles,
    relinkMediaFolder,
    openShowError,
    dismissOpenShowError,
    saveCueError,
    dismissSaveCueError,
    goToPreviousSong,
    goToNextSong,
    handleTimeUpdate,
    advanceOnVideoEnd,
    canGoPrevious: activeSongIndex > 0,
    canGoNext: activeSongIndex >= 0 && activeSongIndex < playlist.length - 1,
    canSaveShow: playlist.length > 0,
    canSaveCues: activeSongIndex >= 0,
    restoreFromSession,
    clearPersistedShow,
    getMediaDirectoryPath,
    getShowFilePath,
  };
}
