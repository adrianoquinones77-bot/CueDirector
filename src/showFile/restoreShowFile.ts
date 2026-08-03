import {
  indexMediaFilesByBaseName,
  loadSongCues,
} from "../cueFile/loadSongCues";
import { collectFilesFromDirectory } from "../media/loadMediaDirectory";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import type { Song } from "../types/song";
import { logShowRestore } from "./showMediaPaths";

export interface RestoreShowResult {
  showInfo: CueDirectorFile["showInfo"];
  preferences: CueDirectorFile["preferences"];
  timeline: CueDirectorFile["timeline"];
  playlist: Song[];
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
    if (extension !== "mp4" && extension !== "mov" && extension !== "m4v" && !file.type.startsWith("video/")) {
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

function resolveVideoFile(
  entry: CueDirectorFile["playlist"][number],
  maps: ReturnType<typeof buildVideoFileMaps>,
): File | undefined {
  if (entry.videoRelativePath) {
    const byPath = maps.byRelativePath.get(
      entry.videoRelativePath.replace(/\\/g, "/").toLowerCase(),
    );
    if (byPath) return byPath;
  }

  return maps.byName.get(entry.videoFilename.toLowerCase());
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

  for (const entry of showFile.playlist) {
    const videoFile = resolveVideoFile(entry, videoMaps);
    const baseNameKey = entry.id.toLowerCase();
    const cues = await loadSongCues({
      csvFile: csvs.get(baseNameKey),
      cuesFile: cuesByBaseName.get(baseNameKey),
      fallbackCues: entry.cues,
    });

    if (!videoFile) {
      missingVideoFiles.push(entry.videoFilename);
      playlist.push({
        id: entry.id,
        title: entry.title,
        videoFilename: entry.videoFilename,
        videoRelativePath: entry.videoRelativePath,
        videoUrl: "",
        cues,
      });
      continue;
    }

    const relativePath =
      "webkitRelativePath" in videoFile &&
      typeof videoFile.webkitRelativePath === "string" &&
      videoFile.webkitRelativePath
        ? videoFile.webkitRelativePath.replace(/\\/g, "/")
        : entry.videoRelativePath;

    playlist.push({
      id: entry.id,
      title: entry.title,
      videoFilename: videoFile.name,
      videoRelativePath: relativePath,
      videoUrl: URL.createObjectURL(videoFile),
      cues,
    });
  }

  logShowRestore("Missing videos after restore", missingVideoFiles);

  return {
    showInfo: showFile.showInfo,
    preferences: showFile.preferences,
    timeline: showFile.timeline ?? { zoom: 1 },
    playlist,
    missingVideoFiles,
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
