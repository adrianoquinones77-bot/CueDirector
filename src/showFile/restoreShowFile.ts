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
} {
  const byName = new Map<string, File>();
  const byRelativePath = new Map<string, File>();

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

  return { byName, byRelativePath };
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
  // Cache resolved files so playlist + saved library share object URLs.
  const resolvedByKey = new Map<string, RuntimeShowMediaItem>();

  const resolveMember = (
    entry: {
      filename?: string;
      relativePath?: string;
      videoFilename?: string;
      videoRelativePath?: string;
    },
    mediaId?: string,
  ): RuntimeShowMediaItem | undefined => {
    const file = resolveVideoFile(entry, videoMaps);
    if (!file) return undefined;

    const { relativePath: entryPath } = mediaLookupKeys(entry);
    const relativePath =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath.replace(/\\/g, "/")
        : entryPath;
    const fileId = makeMediaId(file.name, relativePath);
    const id = mediaId || fileId;

    const cached = resolvedByKey.get(id) ?? resolvedByKey.get(fileId);
    if (cached) {
      const item =
        cached.id === id ? cached : { ...cached, id };
      resolvedByKey.set(id, item);
      resolvedByKey.set(fileId, item);
      return item;
    }

    const item: RuntimeShowMediaItem = {
      id,
      filename: file.name,
      relativePath,
      url: createVideoObjectUrl(file),
    };
    resolvedByKey.set(id, item);
    resolvedByKey.set(fileId, item);
    return item;
  };

  for (const entry of showFile.playlist) {
    const baseNameKey = entry.id.toLowerCase();
    const cues = await loadSongCues({
      csvFile: csvs.get(baseNameKey),
      cuesFile: cuesByBaseName.get(baseNameKey),
      fallbackCues: entry.cues,
    });

    // Manual set-list songs intentionally have no media.
    if (!entry.videoFilename.trim()) {
      playlist.push({
        id: entry.id,
        title: entry.title,
        videoFilename: "",
        videoRelativePath: entry.videoRelativePath,
        videoUrl: "",
        cues,
        ...(entry.link ? { link: entry.link } : {}),
        ...(entry.setList ? { setList: entry.setList } : {}),
      });
      continue;
    }

    const libraryItem = resolveMember(entry);

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

  // Show membership is authoritative — only playlist + saved mediaLibrary.
  // Importing every file from the media folder reintroduces deleted songs.
  const mediaLibraryMembers: RuntimeShowMediaItem[] = [];
  for (const saved of showFile.mediaLibrary ?? []) {
    const item = resolveMember(saved, saved.id);
    if (!item) {
      missingVideoFiles.push(saved.filename);
      continue;
    }
    mediaLibraryMembers.push(item);
  }

  const mediaLibrary = mergeMediaLibraries(
    mediaLibraryMembers,
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
