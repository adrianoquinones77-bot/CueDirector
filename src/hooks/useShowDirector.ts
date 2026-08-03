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
import { parseCueDirectorFile } from "../showFile/parseCueDirectorFile";
import {
  restoreShowFromDirectory,
  restoreShowFromFile,
} from "../showFile/restoreShowFile";
import { downloadShowFile } from "../showFile/saveShowFile";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import type { Cue } from "../types/cue";
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
    const directoryHandle = await pickMediaDirectory();
    if (!directoryHandle) return;

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
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const songs = await buildPlaylistFromFiles(files);
      applyLoadedPlaylist(songs);
    },
    [applyLoadedPlaylist, playlist],
  );

  const saveShow = useCallback(() => {
    if (playlist.length === 0) return;

    downloadShowFile({
      showInfo,
      autoAdvance,
      defaultCueDuration,
      playlist,
    });
  }, [showInfo, autoAdvance, defaultCueDuration, playlist]);

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
      return true;
    } catch (error) {
      pendingShowRef.current = null;
      setOpenShowError(
        error instanceof Error ? error.message : "Invalid show file",
      );
      return false;
    }
  }, []);

  const applyRestoredShow = useCallback(
    (result: Awaited<ReturnType<typeof restoreShowFromFile>>) => {
      setShowInfo(result.showInfo);
      setAutoAdvance(result.preferences.autoAdvance);
      setDefaultCueDuration(result.preferences.defaultCueDuration);
      setPlaylist(result.playlist);
      setMissingVideoFiles(result.missingVideoFiles);

      if (result.playlist.length > 0) {
        setActiveSongIndex(0);
        setCues(result.playlist[0].cues);
        setCurrentTime(0);
      } else {
        setActiveSongIndex(-1);
        setCues([]);
        setCurrentTime(0);
      }
    },
    [],
  );

  const connectMediaDirectory = useCallback(
    async (directoryHandle: FileSystemDirectoryHandle) => {
      const pendingShow = pendingShowRef.current;
      pendingShowRef.current = null;

      if (!pendingShow) return;

      mediaDirectoryRef.current = directoryHandle;
      revokePlaylistUrls(playlist);

      const result = await restoreShowFromDirectory(pendingShow, directoryHandle);
      cueFileHandlesRef.current.replaceAll(result.cuesFileHandles);
      applyRestoredShow(result);
    },
    [applyRestoredShow, playlist],
  );

  const connectMediaFolder = useCallback(
    async (files: FileList) => {
      const pendingShow = pendingShowRef.current;
      pendingShowRef.current = null;

      if (!pendingShow) return;

      mediaDirectoryRef.current = null;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const result = await restoreShowFromFile(pendingShow, files);
      applyRestoredShow(result);
    },
    [applyRestoredShow, playlist],
  );

  const cancelOpenShow = useCallback(() => {
    pendingShowRef.current = null;
  }, []);

  const dismissMissingVideoFiles = useCallback(() => {
    setMissingVideoFiles([]);
  }, []);

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
    connectMediaFolder,
    connectMediaDirectory,
    cancelOpenShow,
    missingVideoFiles,
    dismissMissingVideoFiles,
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
  };
}
