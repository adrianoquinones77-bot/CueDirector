import {
  indexMediaFilesByBaseName,
  loadSongCues,
} from "../cueFile/loadSongCues";
import { collectFilesFromDirectory } from "../media/loadMediaDirectory";
import { createVideoObjectUrl } from "../media/videoObjectUrl";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import {
  makeMediaId,
  type RuntimeShowMediaItem,
} from "../types/showMedia";
import type { Song } from "../types/song";
import {
  buildMediaLibraryFromPlaylist,
  mergeMediaLibraries,
} from "./mediaLibrary";
import { logShowRestore } from "./showMediaPaths";

export interface RestoreShowResult {
  showInfo: CueDirectorFile["showInfo"];
  preferences: CueDirectorFile["preferences"];
  timeline: CueDirectorFile["timeline"];
  playlist: Song[];
  mediaLibrary: RuntimeShowMediaItem[];
  missingVideoFiles: string[];
}

function buildVideoFileMaps(files: FileList | File[]): {
  byName: Map<string, File>;
  byRelativePath: Map<string, File>;
  allVideos: File[];
} {
  const byName = new Map<string, File>();
  const byRelativePath = new Map<string, File>();
  const allVideos: File[] = [];

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

    allVideos.push(file);
    byName.set(file.name.toLowerCase(), file);

    const relativePath =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath.replace(/\\/g, "/").toLowerCase()
        : undefined;

    if (relativePath) {
      byRelativePath.set(relativePath, file);
    }
  }

  return { byName, byRelativePath, allVideos };
}

function mediaLookupKeys(entry: {
  id?: string;
  filename?: string;
  relativePath?: string;
  videoFilename?: string;
  videoRelativePath?: string;
}): { filename: string; relativePath?: string; id?: string } {
  return {
    id: entry.id,
    filename: entry.filename ?? entry.videoFilename ?? "",
    relativePath: entry.relativePath ?? entry.videoRelativePath,
  };
}

function resolveVideoFile(
  entry: {
    filename?: string;
    relativePath?: string;
    videoFilename?: string;
    videoRelativePath?: string;
  },
  maps: ReturnType<typeof buildVideoFileMaps>,
): File | undefined {
  const { filename, relativePath } = mediaLookupKeys(entry);

  if (relativePath) {
    const byPath = maps.byRelativePath.get(
      relativePath.replace(/\\/g, "/").toLowerCase(),
    );
    if (byPath) return byPath;
  }

  if (!filename) return undefined;
  return maps.byName.get(filename.toLowerCase());
}

function buildLibraryFromVideoFiles(
  files: File[],
): RuntimeShowMediaItem[] {
  const items: RuntimeShowMediaItem[] = [];

  for (const file of files) {
    const relativePath =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath.replace(/\\/g, "/")
        : undefined;

    items.push({
      id: makeMediaId(file.name, relativePath),
      filename: file.name,
      relativePath,
      url: createVideoObjectUrl(file),
    });
  }

  return items;
}

function findLibraryItemForEntry(
  entry: {
    id?: string;
    filename?: string;
    relativePath?: string;
    videoFilename?: string;
    videoRelativePath?: string;
  },
  library: RuntimeShowMediaItem[],
): RuntimeShowMediaItem | undefined {
  const { id, filename, relativePath } = mediaLookupKeys(entry);

  if (id) {
    const byId = library.find((item) => item.id === id);
    if (byId) return byId;
  }

  if (relativePath) {
    const byPath = library.find(
      (item) =>
        item.relativePath?.replace(/\\/g, "/").toLowerCase() ===
        relativePath.replace(/\\/g, "/").toLowerCase(),
    );
    if (byPath) return byPath;
  }

  if (!filename) return undefined;
  return library.find(
    (item) => item.filename.toLowerCase() === filename.toLowerCase(),
  );
}

export async function restoreShowFromFile(
  showFile: CueDirectorFile,
  mediaFiles: FileList | File[],
): Promise<RestoreShowResult> {
  logShowRestore("Saved media path from .show", showFile.mediaDirectoryPath ?? "(none)");
  logShowRestore("Searching media in provided folder files", Array.from(mediaFiles).length);

  const videoMaps = buildVideoFileMaps(mediaFiles);
  const { csvs, cues: cuesByBaseName } = indexMediaFilesByBaseName(mediaFiles);
  const missingVideoFiles: string[] = [];
  const playlist: Song[] = [];

  let mediaLibrary = buildLibraryFromVideoFiles(videoMaps.allVideos);

  for (const entry of showFile.playlist) {
    const libraryItem = findLibraryItemForEntry(entry, mediaLibrary);
    const baseNameKey = entry.id.toLowerCase();
    const cues = await loadSongCues({
      csvFile: csvs.get(baseNameKey),
      cuesFile: cuesByBaseName.get(baseNameKey),
      fallbackCues: entry.cues,
    });

    if (!libraryItem) {
      missingVideoFiles.push(entry.videoFilename);
      playlist.push({
        id: entry.id,
        title: entry.title,
        videoFilename: entry.videoFilename,
        videoRelativePath: entry.videoRelativePath,
        videoUrl: "",
        cues,
        ...(entry.link ? { link: entry.link } : {}),
        ...(entry.setList ? { setList: entry.setList } : {}),
      });
      continue;
    }

    playlist.push({
      id: entry.id,
      title: entry.title,
      videoFilename: libraryItem.filename,
      videoRelativePath: libraryItem.relativePath ?? entry.videoRelativePath,
      videoUrl: libraryItem.url,
      cues,
      ...(entry.link ? { link: entry.link } : {}),
      ...(entry.setList ? { setList: entry.setList } : {}),
    });
  }

  // Resolve explicitly saved library entries that may use custom ids.
  for (const saved of showFile.mediaLibrary ?? []) {
    if (mediaLibrary.some((item) => item.id === saved.id)) continue;

    const file = resolveVideoFile(saved, videoMaps);
    if (!file) {
      missingVideoFiles.push(saved.filename);
      continue;
    }

    const existing = findLibraryItemForEntry(saved, mediaLibrary);
    if (existing) {
      mediaLibrary = mergeMediaLibraries(mediaLibrary, [
        { ...existing, id: saved.id },
      ]);
      continue;
    }

    const relativePath =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath.replace(/\\/g, "/")
        : saved.relativePath;

    mediaLibrary = mergeMediaLibraries(mediaLibrary, [
      {
        id: saved.id,
        filename: file.name,
        relativePath,
        url: createVideoObjectUrl(file),
      },
    ]);
  }

  mediaLibrary = mergeMediaLibraries(
    mediaLibrary,
    buildMediaLibraryFromPlaylist(playlist),
  );

  logShowRestore("Missing videos after restore", missingVideoFiles);

  return {
    showInfo: showFile.showInfo,
    preferences: showFile.preferences,
    timeline: showFile.timeline ?? { zoom: 1 },
    playlist,
    mediaLibrary,
    missingVideoFiles: [...new Set(missingVideoFiles)],
  };
}

export async function restoreShowFromDirectory(
  showFile: CueDirectorFile,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<RestoreShowResult & { cuesFileHandles: Map<string, FileSystemFileHandle> }> {
  const { files, cuesFileHandles } =
    await collectFilesFromDirectory(directoryHandle);
  const result = await restoreShowFromFile(showFile, files);

  return {
    ...result,
    cuesFileHandles,
  };
}
