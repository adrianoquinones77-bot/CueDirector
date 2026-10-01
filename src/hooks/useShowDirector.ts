import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { setPlaybackTime } from "../playback/playbackClock";
import {
  buildPlaylistFromFiles,
  revokeMediaUrls,
  revokePlaylistUrls,
} from "../buildPlaylist";
import { createCueFileHandleRegistry } from "../cueFile/cueFileHandleRegistry";
import {
  resolveImportedCues,
  type ImportCueMode,
} from "../cueFile/importSongCues";
import {
  createSongCueFile,
  downloadSongCueFile,
  getSaveCueErrorMessage,
  updateSongCueFile,
} from "../cueFile/persistCueFile";
import { demoCues } from "../demoCues";
import {
  buildPlaylistFromDirectory,
  collectFilesFromDirectory,
  pickMediaDirectory,
} from "../media/loadMediaDirectory";
import {
  collectVideosFromDirectoryHandle,
  collectVideosFromFileList,
  indexVideosByFilename,
  pickMediaFolderViaInput,
  pickVideoFilesViaInput,
  relinkMissingVideos,
} from "../media/relinkMedia";
import { createVideoObjectUrl } from "../media/videoObjectUrl";
import { clearLastShowSession } from "../session/lastShowStorage";
import {
  buildMediaLibraryFromPlaylist,
  mediaIdForSong,
  mergeMediaLibraries,
  resolveCueVideoUrl,
  songFromMediaItem,
} from "../showFile/mediaLibrary";
import {
  applyShowPlaylistMetadata,
  findShowFileInList,
} from "../showFile/applyShowPlaylistMetadata";
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
import {
  downloadShowFile,
  ensureShowFileExtension,
  getSuggestedShowFilename,
  writeShowFileToPath,
  type SaveShowInput,
} from "../showFile/saveShowFile";
import type { CueDirectorFile } from "../types/cueDirectorFile";

export type SaveShowResult = "saved" | "cancelled" | "error" | "empty";
import type { Cue } from "../types/cue";
import type { LastShowSession } from "../types/lastShowSession";
import {
  makeMediaId,
  type RuntimeShowMediaItem,
} from "../types/showMedia";
import { defaultShowInfo, type ShowInfo } from "../types/showInfo";
import type { AdvanceOnEndResult, Song } from "../types/song";
import type { SongLink } from "../types/songLink";
import {
  normalizeSongSetList,
  type SongSetList,
} from "../types/songSetList";
import { DEFAULT_CUE_DURATION } from "../utils/cueTiming";
import {
  moveSongInPlaylist,
  moveSongToShowPosition,
} from "../utils/reorderPlaylist";

function makeManualSongId(name: string, existingIds: Set<string>): string {
  const slug =
    name
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 40) || "song";
  let id = `manual_${slug}`;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `manual_${slug}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function sortCues(cues: Cue[]): Cue[] {
  return [...cues].sort((a, b) => a.time - b.time);
}

export function useShowDirector() {
  const [cues, setCues] = useState<Cue[]>(demoCues);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [activeSongIndex, setActiveSongIndex] = useState(-1);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [directorMode, setDirectorModeState] = useState(false);
  /** Show-structure / cue editing. Song Linking edit actions require this ON. */
  const [editorMode, setEditorModeState] = useState(false);
  const editorModeRef = useRef(editorMode);
  editorModeRef.current = editorMode;
  const [showInfo, setShowInfo] = useState<ShowInfo>(defaultShowInfo);
  const [defaultCueDuration, setDefaultCueDuration] = useState(
    DEFAULT_CUE_DURATION,
  );
  const [missingVideoFiles, setMissingVideoFiles] = useState<string[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<RuntimeShowMediaItem[]>([]);
  const [playbackVideoUrl, setPlaybackVideoUrl] = useState<string | undefined>();
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
  const mediaLibraryRef = useRef(mediaLibrary);
  mediaLibraryRef.current = mediaLibrary;

  const activeVideoSrc = playbackVideoUrl || activeSong?.videoUrl || undefined;

  const selectSong = useCallback(
    (index: number) => {
      const song = playlist[index];
      if (!song) return;

      setActiveSongIndex(index);
      setCues(song.cues);
      setPlaybackTime(0);
      setPlaybackVideoUrl(undefined);
    },
    [playlist],
  );

  const activateSongAtIndex = useCallback((songs: Song[], index: number) => {
    const song = songs[index];
    if (!song) return;

    playlistRef.current = songs;
    setPlaylist(songs);
    setActiveSongIndex(index);
    setCues(song.cues);
    setPlaybackTime(0);
    setPlaybackVideoUrl(undefined);
  }, []);

  /** Select a media-library video as the active song/player source. */
  const selectMedia = useCallback(
    (mediaId: string) => {
      const current = playlistRef.current;
      const existingIndex = current.findIndex(
        (song) => mediaIdForSong(song) === mediaId,
      );

      // Prefer an existing playlist song so link metadata is preserved and
      // previously played linked songs remain manually selectable.
      if (existingIndex >= 0) {
        activateSongAtIndex(current, existingIndex);
        return;
      }

      const item = mediaLibraryRef.current.find((entry) => entry.id === mediaId);
      if (!item?.url) return;

      const nextSongs = [...current, songFromMediaItem(item)];
      activateSongAtIndex(nextSongs, nextSongs.length - 1);
    },
    [activateSongAtIndex],
  );

  const syncPlaylistWithLibraryItems = useCallback(
    (items: RuntimeShowMediaItem[]): number => {
      const previousIds = new Set(
        mediaLibraryRef.current.map((entry) => entry.id),
      );
      const newItems = items.filter((item) => !previousIds.has(item.id));

      const nextLibrary = mergeMediaLibraries(
        mediaLibraryRef.current,
        items,
      );
      setMediaLibrary(nextLibrary);

      if (newItems.length === 0) {
        return 0;
      }

      const existingMediaIds = new Set(
        playlistRef.current.map((song) => mediaIdForSong(song)),
      );
      const songsToAdd = newItems
        .filter((item) => item.url && !existingMediaIds.has(item.id))
        .map((item) => songFromMediaItem(item));

      if (songsToAdd.length === 0) {
        return newItems.length;
      }

      const nextSongs = [...playlistRef.current, ...songsToAdd];
      const shouldSelectFirst =
        playlistRef.current.length === 0 || activeSongIndex < 0;
      const selectIndex = shouldSelectFirst
        ? playlistRef.current.length
        : activeSongIndex;

      playlistRef.current = nextSongs;
      setPlaylist(nextSongs);

      if (shouldSelectFirst && nextSongs[selectIndex]) {
        setActiveSongIndex(selectIndex);
        setCues(nextSongs[selectIndex].cues);
        setPlaybackTime(0);
        setPlaybackVideoUrl(undefined);
      }

      return newItems.length;
    },
    [activeSongIndex],
  );

  const revokeRuntimeMedia = useCallback(
    (nextPlaylist: Song[], nextLibrary: RuntimeShowMediaItem[]) => {
      const keep = new Set<string>();
      for (const song of nextPlaylist) {
        if (song.videoUrl) keep.add(song.videoUrl);
      }
      for (const item of nextLibrary) {
        if (item.url) keep.add(item.url);
      }

      const previousUrls = [
        ...playlistRef.current.map((song) => song.videoUrl),
        ...mediaLibraryRef.current.map((item) => item.url),
      ].filter((url) => url && !keep.has(url));

      revokeMediaUrls(previousUrls);
    },
    [],
  );

  useEffect(() => {
    return () => {
      revokePlaylistUrls(playlistRef.current);
      revokeMediaUrls(mediaLibraryRef.current.map((item) => item.url));
    };
  }, []);

  const applyLoadedPlaylist = useCallback(
    (songs: Song[], library?: RuntimeShowMediaItem[]) => {
      if (songs.length === 0) return;

      const nextLibrary = mergeMediaLibraries(
        library ?? [],
        buildMediaLibraryFromPlaylist(songs),
      );
      revokeRuntimeMedia(songs, nextLibrary);
      setPlaylist(songs);
      setMediaLibrary(nextLibrary);
      setActiveSongIndex(0);
      setCues(songs[0].cues);
      setPlaybackTime(0);
      setPlaybackVideoUrl(undefined);
    },
    [revokeRuntimeMedia],
  );

  const buildSaveInput = useCallback(
    (timelineZoom: number, nextPlaylist: Song[] = playlist): SaveShowInput => ({
      showInfo,
      autoAdvance,
      defaultCueDuration,
      timelineZoom,
      mediaDirectoryPath: mediaDirectoryPathRef.current,
      mediaLibrary,
      playlist: nextPlaylist,
    }),
    [showInfo, autoAdvance, defaultCueDuration, mediaLibrary, playlist],
  );

  const defaultSaveAsPath = useCallback(() => {
    const filename = getSuggestedShowFilename(showInfo);
    const currentPath = showFilePathRef.current;
    if (currentPath) {
      const slash = Math.max(
        currentPath.lastIndexOf("/"),
        currentPath.lastIndexOf("\\"),
      );
      if (slash >= 0) {
        return `${currentPath.slice(0, slash + 1)}${filename}`;
      }
    }
    const mediaRoot = mediaDirectoryPathRef.current;
    if (mediaRoot) {
      const sep = mediaRoot.includes("\\") ? "\\" : "/";
      const root = mediaRoot.endsWith("/") || mediaRoot.endsWith("\\")
        ? mediaRoot
        : `${mediaRoot}${sep}`;
      return `${root}${filename}`;
    }
    return filename;
  }, [showInfo]);

  /**
   * Save As… — always prompt for a new path (Electron) or download (browser).
   * The chosen path becomes the active project for subsequent Save / ⌘S.
   */
  const saveShowAs = useCallback(
    async (timelineZoom: number): Promise<SaveShowResult> => {
      if (playlist.length === 0) return "empty";

      const input = buildSaveInput(timelineZoom);

      try {
        if (window.electronAPI?.pickSaveShowPath) {
          const picked = await window.electronAPI.pickSaveShowPath({
            defaultPath: defaultSaveAsPath(),
          });
          if (!picked) return "cancelled";

          const filePath = ensureShowFileExtension(picked);
          await writeShowFileToPath(filePath, input);
          showFilePathRef.current = filePath;
          return "saved";
        }

        // Browser: download a complete project copy (path cannot be retained).
        downloadShowFile(input);
        return "saved";
      } catch {
        return "error";
      }
    },
    [buildSaveInput, defaultSaveAsPath, playlist.length],
  );

  /**
   * Save — overwrite the active project path, or fall through to Save As
   * when the project has never been saved to disk.
   */
  const saveShow = useCallback(
    async (timelineZoom: number): Promise<SaveShowResult> => {
      if (playlist.length === 0) return "empty";

      const activePath = showFilePathRef.current;
      if (activePath && window.electronAPI) {
        try {
          await writeShowFileToPath(activePath, buildSaveInput(timelineZoom));
          return "saved";
        } catch {
          return "error";
        }
      }

      return saveShowAs(timelineZoom);
    },
    [buildSaveInput, playlist.length, saveShowAs],
  );

  const persistOpenedShowFile = useCallback(
    async (timelineZoom: number, nextPlaylist: Song[]) => {
      if (!showFilePathRef.current) return;

      await writeShowFileToPath(
        showFilePathRef.current,
        buildSaveInput(timelineZoom, nextPlaylist),
      );
    },
    [buildSaveInput],
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

  const saveCues = useCallback(async (): Promise<boolean> => {
    if (activeSongIndex < 0) return false;

    const song = playlist[activeSongIndex];
    if (!song) return false;

    const songWithCues = { ...song, cues: sortCues(cues) };
    const existingHandle = cueFileHandlesRef.current.get(song.id);

    setSaveCueError(null);

    try {
      if (existingHandle) {
        await updateSongCueFile(songWithCues, existingHandle);
        updateActiveSongCues(songWithCues.cues);
        return true;
      }

      let directoryHandle = mediaDirectoryRef.current;
      if (!directoryHandle) {
        directoryHandle = await pickMediaDirectory();
        if (!directoryHandle) {
          downloadSongCueFile(songWithCues);
          return true;
        }
        mediaDirectoryRef.current = directoryHandle;
      }

      const handle = await createSongCueFile(songWithCues, directoryHandle);
      cueFileHandlesRef.current.set(song.id, handle);
      updateActiveSongCues(songWithCues.cues);
      return true;
    } catch (error) {
      try {
        downloadSongCueFile(songWithCues);
        return true;
      } catch (fallbackError) {
        setSaveCueError(getSaveCueErrorMessage(fallbackError));
        return false;
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
      const nextLibrary = mergeMediaLibraries(
        result.mediaLibrary ?? [],
        buildMediaLibraryFromPlaylist(result.playlist),
      );
      revokeRuntimeMedia(result.playlist, nextLibrary);

      setShowInfo(result.showInfo);
      setAutoAdvance(result.preferences.autoAdvance);
      setDefaultCueDuration(result.preferences.defaultCueDuration);
      setPlaylist(result.playlist);
      setMediaLibrary(nextLibrary);
      setMissingVideoFiles(result.missingVideoFiles);
      setPlaybackVideoUrl(undefined);

      if (result.playlist.length > 0) {
        const index = Math.min(
          Math.max(0, options?.activeSongIndex ?? 0),
          result.playlist.length - 1,
        );
        setActiveSongIndex(index);
        setCues(result.playlist[index].cues);
        setPlaybackTime(options?.currentTime ?? 0);
      } else {
        setActiveSongIndex(-1);
        setCues([]);
        setPlaybackTime(0);
      }

      return result.timeline?.zoom ?? 1;
    },
    [revokeRuntimeMedia],
  );

  /**
   * ControlBar "Load Show": prefer restoring a sibling .show so song links
   * (and set-list metadata) are rebuilt into playlist state. Media-only scan
   * is the fallback when no project file is present.
   */
  const loadShowDirectory = useCallback(async () => {
    if (window.electronAPI) {
      const api = window.electronAPI;
      const directoryPath = await api.pickMediaDirectory();
      if (!directoryPath) return;

      mediaDirectoryPathRef.current = directoryPath;
      mediaDirectoryRef.current = null;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const mediaFiles = await api.collectMediaFromDirectory(directoryPath);
      const showEntry = findShowFileInList(mediaFiles);

      if (showEntry) {
        try {
          const showFile = parseCueDirectorFile(
            await api.readTextFile(showEntry.absolutePath),
          );
          showFilePathRef.current = showEntry.absolutePath;
          const result = await restoreShowFromElectronDirectory(
            showFile,
            directoryPath,
          );
          applyRestoredShow(result);
          logShowRestore(
            "Load Show restored project file with song links",
            showEntry.absolutePath,
          );
          return;
        } catch (error) {
          logShowRestore(
            "Load Show failed to restore .show — falling back to media scan",
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      showFilePathRef.current = undefined;
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

    const { files, cuesFileHandles } =
      await collectFilesFromDirectory(directoryHandle);
    const showFileBlob = findShowFileInList(files);

    if (showFileBlob) {
      try {
        const showFile = parseCueDirectorFile(await showFileBlob.text());
        const result = await restoreShowFromDirectory(
          showFile,
          directoryHandle,
        );
        cueFileHandlesRef.current.replaceAll(result.cuesFileHandles);
        applyRestoredShow(result);
        logShowRestore(
          "Load Show restored project file with song links",
          showFileBlob.name,
        );
        return;
      } catch (error) {
        logShowRestore(
          "Load Show failed to restore .show — falling back to media scan",
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const { songs } = await buildPlaylistFromDirectory(directoryHandle);
    cueFileHandlesRef.current.replaceAll(cuesFileHandles);
    applyLoadedPlaylist(songs);
  }, [applyLoadedPlaylist, applyRestoredShow, playlist]);

  const loadShow = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      mediaDirectoryRef.current = null;
      mediaDirectoryPathRef.current = undefined;
      showFilePathRef.current = undefined;
      cueFileHandlesRef.current.clear();
      revokePlaylistUrls(playlist);

      const fileList = Array.from(files);
      const showFileBlob = findShowFileInList(fileList);

      if (showFileBlob) {
        try {
          const showFile = parseCueDirectorFile(await showFileBlob.text());
          const derivedPath = deriveMediaDirectoryFromFiles(files);
          if (derivedPath) {
            mediaDirectoryPathRef.current = derivedPath;
          }
          const result = await restoreShowFromFile(showFile, files);
          applyRestoredShow(result);
          logShowRestore(
            "Load Show restored project file with song links",
            showFileBlob.name,
          );
          return;
        } catch (error) {
          logShowRestore(
            "Load Show failed to restore .show — merging link metadata",
            error instanceof Error ? error.message : String(error),
          );
          try {
            const showFile = parseCueDirectorFile(await showFileBlob.text());
            const songs = applyShowPlaylistMetadata(
              await buildPlaylistFromFiles(files),
              showFile,
            );
            applyLoadedPlaylist(songs);
            return;
          } catch {
            // Fall through to media-only load.
          }
        }
      }

      const songs = await buildPlaylistFromFiles(files);
      applyLoadedPlaylist(songs);
    },
    [applyLoadedPlaylist, applyRestoredShow, playlist],
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
    revokeRuntimeMedia([], []);
    mediaDirectoryRef.current = null;
    mediaDirectoryPathRef.current = undefined;
    showFilePathRef.current = undefined;
    cueFileHandlesRef.current.clear();
    pendingShowRef.current = null;
    setPlaylist([]);
    setMediaLibrary([]);
    setPlaybackVideoUrl(undefined);
    setActiveSongIndex(-1);
    setCues(demoCues);
    setPlaybackTime(0);
    setShowInfo(defaultShowInfo);
    setAutoAdvance(true);
    setDefaultCueDuration(DEFAULT_CUE_DURATION);
    setMissingVideoFiles([]);
  }, [revokeRuntimeMedia]);

  /** File → New Show — empty untitled project; clears active project path. */
  const newShow = useCallback(async () => {
    await clearLastShowSession();
    revokeRuntimeMedia([], []);
    mediaDirectoryRef.current = null;
    mediaDirectoryPathRef.current = undefined;
    showFilePathRef.current = undefined;
    cueFileHandlesRef.current.clear();
    pendingShowRef.current = null;
    setPlaylist([]);
    setMediaLibrary([]);
    setPlaybackVideoUrl(undefined);
    setActiveSongIndex(-1);
    setCues([]);
    setPlaybackTime(0);
    setShowInfo(defaultShowInfo);
    setAutoAdvance(true);
    setDefaultCueDuration(DEFAULT_CUE_DURATION);
    setMissingVideoFiles([]);
    setOpenShowError(null);
    setSaveCueError(null);
  }, [revokeRuntimeMedia]);

  const addVideosToLibrary = useCallback(async (): Promise<number> => {
    if (window.electronAPI) {
      // On desktop, pick files by scanning a folder (prefer connected media root).
      const directoryPath =
        mediaDirectoryPathRef.current ??
        (await window.electronAPI.pickMediaDirectory());
      if (!directoryPath) return 0;
      mediaDirectoryPathRef.current = directoryPath;

      const videos =
        await window.electronAPI.collectVideosRecursively(directoryPath);
      const items: RuntimeShowMediaItem[] = [];
      for (const video of videos) {
        const relativePath = video.relativePath.replace(/\\/g, "/");
        items.push({
          id: makeMediaId(video.name, relativePath),
          filename: video.name,
          relativePath,
          url: await window.electronAPI.pathToFileUrl(video.absolutePath),
        });
      }

      return syncPlaylistWithLibraryItems(items);
    }

    const files = await pickVideoFilesViaInput();
    if (!files) return 0;

    const items: RuntimeShowMediaItem[] = [];
    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (
        extension !== "mp4" &&
        extension !== "mov" &&
        extension !== "m4v" &&
        !file.type.startsWith("video/")
      ) {
        continue;
      }

      const relativePath =
        "webkitRelativePath" in file &&
        typeof file.webkitRelativePath === "string" &&
        file.webkitRelativePath
          ? file.webkitRelativePath.replace(/\\/g, "/")
          : undefined;

      const url = createVideoObjectUrl(file);

      items.push({
        id: makeMediaId(file.name, relativePath),
        filename: file.name,
        relativePath,
        url,
      });
    }

    return syncPlaylistWithLibraryItems(items);
  }, [syncPlaylistWithLibraryItems]);

  /** Switch player source for a cue when it references another library video. */
  const prepareCueVideo = useCallback(
    (cue: Cue): { url?: string; didChange: boolean } => {
      const songUrl = activeSong?.videoUrl || undefined;
      const targetUrl = resolveCueVideoUrl(mediaLibrary, cue.videoId, songUrl);
      const currentUrl = playbackVideoUrl || songUrl;
      const didChange = Boolean(targetUrl && targetUrl !== currentUrl);

      if (cue.videoId && targetUrl && targetUrl !== songUrl) {
        setPlaybackVideoUrl(targetUrl);
      } else {
        setPlaybackVideoUrl(undefined);
      }

      return { url: targetUrl, didChange };
    },
    [activeSong?.videoUrl, mediaLibrary, playbackVideoUrl],
  );

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
    setPlaybackTime(time);
  }, []);

  /**
   * Link selected playlist songs into a playback chain (playlist order).
   * Editor Mode only — no-ops in Performance Mode.
   */
  const linkSongs = useCallback((songIds: string[]): boolean => {
    if (!editorModeRef.current) return false;

    const uniqueIds = [...new Set(songIds)];
    if (uniqueIds.length < 2) return false;

    const selected = playlistRef.current.filter((song) =>
      uniqueIds.includes(song.id),
    );
    if (selected.length < 2) return false;

    const nextById = new Map<string, string>();
    for (let index = 0; index < selected.length - 1; index += 1) {
      nextById.set(selected[index].id, selected[index + 1].id);
    }
    const selectedSet = new Set(selected.map((song) => song.id));

    setPlaylist((previous) =>
      previous.map((song) => {
        if (!selectedSet.has(song.id)) return song;

        const nextSongId = nextById.get(song.id);
        if (!nextSongId) {
          if (!song.link) return song;
          const { link: _removed, ...rest } = song;
          return rest;
        }

        const link: SongLink = {
          nextSongId,
          ...(song.link?.options ? { options: song.link.options } : {}),
        };
        return { ...song, link };
      }),
    );

    return true;
  }, []);

  /**
   * Unlink a song from any chain. Editor Mode only — no-ops in Performance Mode.
   * Playback of existing links is unchanged (see advanceOnVideoEnd).
   */
  const breakSongLink = useCallback((songId: string): boolean => {
    if (!editorModeRef.current) return false;

    let changed = false;

    setPlaylist((previous) =>
      previous.map((song) => {
        const isTarget = song.id === songId;
        const pointsHere = song.link?.nextSongId === songId;
        if (!isTarget && !pointsHere) return song;
        if (!song.link) return song;
        changed = true;
        const { link: _removed, ...rest } = song;
        return rest;
      }),
    );

    return changed;
  }, []);

  /**
   * Remove a song from the show playlist (cues + links). Editor Mode only.
   * Does not delete media files on disk.
   */
  /**
   * Reorder the show playlist only. Song identity and all song data
   * (cues, links, set list, important flags) are preserved.
   */
  const reorderPlaylist = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const current = playlistRef.current;
      const next = moveSongInPlaylist(current, fromIndex, toIndex);
      if (next === current) return false;

      const activeId =
        activeSongIndex >= 0 ? current[activeSongIndex]?.id : undefined;

      playlistRef.current = next;
      setPlaylist(next);

      if (activeId) {
        const nextActive = next.findIndex((song) => song.id === activeId);
        if (nextActive >= 0 && nextActive !== activeSongIndex) {
          setActiveSongIndex(nextActive);
        }
      }

      return true;
    },
    [activeSongIndex],
  );

  /** Move a song to a 1-based show position (Set List number). */
  const moveSongToPosition = useCallback(
    (songId: string, position: number): boolean => {
      const current = playlistRef.current;
      const fromIndex = current.findIndex((song) => song.id === songId);
      if (fromIndex < 0) return false;

      const next = moveSongToShowPosition(current, fromIndex, position);
      if (next === current) return false;

      const activeId =
        activeSongIndex >= 0 ? current[activeSongIndex]?.id : undefined;

      playlistRef.current = next;
      setPlaylist(next);

      if (activeId) {
        const nextActive = next.findIndex((song) => song.id === activeId);
        if (nextActive >= 0 && nextActive !== activeSongIndex) {
          setActiveSongIndex(nextActive);
        }
      }

      return true;
    },
    [activeSongIndex],
  );

  const deleteSong = useCallback(
    (songId: string): boolean => {
      if (!editorModeRef.current) return false;

      const current = playlistRef.current;
      const index = current.findIndex((song) => song.id === songId);
      if (index < 0) return false;

      const removed = current[index];
      if (!removed) return false;

      const mediaId = mediaIdForSong(removed);
      const nextPlaylist = current
        .filter((song) => song.id !== songId)
        .map((song) => {
          if (song.link?.nextSongId !== songId) return song;
          const { link: _removed, ...rest } = song;
          return rest;
        });

      const nextLibrary = mediaLibraryRef.current.filter(
        (item) => item.id !== mediaId,
      );

      revokeRuntimeMedia(nextPlaylist, nextLibrary);
      cueFileHandlesRef.current.delete(songId);

      playlistRef.current = nextPlaylist;
      setPlaylist(nextPlaylist);
      setMediaLibrary(nextLibrary);

      if (nextPlaylist.length === 0) {
        setActiveSongIndex(-1);
        setCues([]);
        setPlaybackTime(0);
        setPlaybackVideoUrl(undefined);
        return true;
      }

      const wasActive = index === activeSongIndex;
      let nextActive = activeSongIndex;

      if (wasActive) {
        // Prefer the next song at the same index; otherwise the previous.
        nextActive =
          index < nextPlaylist.length ? index : nextPlaylist.length - 1;
      } else if (index < activeSongIndex) {
        nextActive = activeSongIndex - 1;
      }

      const nextSong = nextPlaylist[nextActive];
      if (!nextSong) {
        setActiveSongIndex(-1);
        setCues([]);
        setPlaybackTime(0);
        setPlaybackVideoUrl(undefined);
        return true;
      }

      setActiveSongIndex(nextActive);
      setCues(nextSong.cues);

      if (wasActive) {
        setPlaybackTime(0);
        setPlaybackVideoUrl(undefined);
      }

      return true;
    },
    [activeSongIndex, revokeRuntimeMedia],
  );

  const advanceOnVideoEnd = useCallback((): AdvanceOnEndResult => {
    const current = activeSongIndex >= 0 ? playlist[activeSongIndex] : undefined;
    if (!current) return { advanced: false, autoPlay: false };

    const linkedNextId = current.link?.nextSongId;
    if (linkedNextId) {
      const nextIndex = playlist.findIndex((song) => song.id === linkedNextId);
      if (nextIndex >= 0) {
        selectSong(nextIndex);
        return { advanced: true, autoPlay: true };
      }
    }

    if (!autoAdvance) return { advanced: false, autoPlay: false };
    if (activeSongIndex >= 0 && activeSongIndex < playlist.length - 1) {
      selectSong(activeSongIndex + 1);
      return { advanced: true, autoPlay: false };
    }

    return { advanced: false, autoPlay: false };
  }, [autoAdvance, activeSongIndex, playlist, selectSong]);

  const updateShowInfo = useCallback(
    (field: keyof ShowInfo, value: string) => {
      setShowInfo((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  /** Display-only set list patch — never touches media filenames or playback. */
  const updateSongSetList = useCallback(
    (songId: string, patch: Partial<SongSetList>) => {
      setPlaylist((previous) =>
        previous.map((song) => {
          if (song.id !== songId) return song;

          const next: SongSetList = { ...song.setList };

          if (patch.displayName !== undefined) {
            const trimmed = patch.displayName.trim();
            if (trimmed) next.displayName = trimmed;
            else delete next.displayName;
          }

          if (patch.durationSec !== undefined) {
            if (
              Number.isFinite(patch.durationSec) &&
              patch.durationSec >= 0
            ) {
              next.durationSec = patch.durationSec;
            } else {
              delete next.durationSec;
            }
          }

          if (patch.parts !== undefined) {
            // Keep blank rows while editing; persistence strips empties on save.
            if (patch.parts.length === 0) delete next.parts;
            else next.parts = patch.parts;
          }

          if (patch.notes !== undefined) {
            const trimmed = patch.notes.trim();
            if (trimmed) next.notes = trimmed;
            else delete next.notes;
          }

          if (Object.keys(next).length === 0) {
            if (!song.setList) return song;
            const { setList: _removed, ...rest } = song;
            return rest;
          }

          return { ...song, setList: next };
        }),
      );
    },
    [],
  );

  /**
   * Add a set-list-only song with no media / cues.
   * Identity is stable for later reordering and optional video attach.
   */
  const addManualSong = useCallback(
    (songName: string, notes = ""): boolean => {
      const name = songName.trim();
      if (!name) return false;

      const existingIds = new Set(
        playlistRef.current.map((song) => song.id),
      );
      const id = makeManualSongId(name, existingIds);
      const setList = normalizeSongSetList({
        displayName: name,
        notes: notes.trim() || undefined,
      });

      const song: Song = {
        id,
        title: name,
        videoFilename: "",
        videoUrl: "",
        cues: [],
        ...(setList ? { setList } : {}),
      };

      const nextPlaylist = [...playlistRef.current, song];
      playlistRef.current = nextPlaylist;
      setPlaylist(nextPlaylist);

      if (activeSongIndex < 0) {
        setActiveSongIndex(nextPlaylist.length - 1);
        setCues([]);
        setPlaybackTime(0);
        setPlaybackVideoUrl(undefined);
      }

      return true;
    },
    [activeSongIndex],
  );

  /** Cache active song duration for Set List display when the player reports it. */
  const recordActiveSongDuration = useCallback(
    (durationSec: number) => {
      if (
        activeSongIndex < 0 ||
        !Number.isFinite(durationSec) ||
        durationSec <= 0
      ) {
        return;
      }

      const song = playlistRef.current[activeSongIndex];
      if (!song) return;
      if (
        song.setList?.durationSec !== undefined &&
        Math.abs(song.setList.durationSec - durationSec) < 0.5
      ) {
        return;
      }

      updateSongSetList(song.id, { durationSec });
    },
    [activeSongIndex, updateSongSetList],
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
      if (!Number.isFinite(cue.time) || cue.time < 0 || !cue.text.trim()) {
        console.error("[NEW CUE CREATED] rejected invalid cue", cue);
        return;
      }
      applyActiveSongCues((existing) => [...existing, cue]);
    },
    [applyActiveSongCues],
  );

  const updateCue = useCallback(
    (index: number, cue: Cue) => {
      if (!Number.isFinite(cue.time) || cue.time < 0 || !cue.text.trim()) {
        console.error("[NEW CUE CREATED] rejected invalid cue update", cue);
        return;
      }
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

  /**
   * Import cues into an existing playlist song. Does not create or duplicate
   * songs — only the cues array on that song entry is updated.
   */
  const importSongCues = useCallback(
    (songId: string, imported: Cue[], mode: ImportCueMode): boolean => {
      const current = playlistRef.current;
      const index = current.findIndex((song) => song.id === songId);
      if (index < 0) return false;

      const song = current[index];
      if (!song) return false;

      const nextCues = sortCues(
        resolveImportedCues(song.cues, imported, mode),
      );

      const nextPlaylist = current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, cues: nextCues } : entry,
      );

      playlistRef.current = nextPlaylist;
      setPlaylist(nextPlaylist);

      if (index === activeSongIndex) {
        setCues(nextCues);
      }

      const handle = cueFileHandlesRef.current.get(songId);
      if (handle) {
        void updateSongCueFile({ ...song, cues: nextCues }, handle).catch(
          (error) => {
            setSaveCueError(getSaveCueErrorMessage(error));
          },
        );
      }

      return true;
    },
    [activeSongIndex],
  );

  return {
    cues,
    playlist,
    mediaLibrary,
    activeSongIndex,
    activeVideoSrc,
    showInfo,
    updateShowInfo,
    updateSongSetList,
    addManualSong,
    recordActiveSongDuration,
    autoAdvance,
    setAutoAdvance,
    directorMode,
    setDirectorMode,
    editorMode,
    setEditorMode,
    addCue,
    updateCue,
    deleteCue,
    importSongCues,
    defaultCueDuration,
    setDefaultCueDuration,
    selectSong,
    selectMedia,
    linkSongs,
    breakSongLink,
    reorderPlaylist,
    moveSongToPosition,
    deleteSong,
    loadShow,
    loadShowDirectory,
    newShow,
    saveShow,
    saveShowAs,
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
    addVideosToLibrary,
    prepareCueVideo,
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
    getMediaLibrary: () => mediaLibraryRef.current,
  };
}
