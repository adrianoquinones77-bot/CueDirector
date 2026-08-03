import {
  indexMediaFilesByBaseName,
  loadSongCues,
} from "../cueFile/loadSongCues";
import { collectFilesFromDirectory } from "../media/loadMediaDirectory";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import type { Song } from "../types/song";

export interface RestoreShowResult {
  showInfo: CueDirectorFile["showInfo"];
  preferences: CueDirectorFile["preferences"];
  playlist: Song[];
  missingVideoFiles: string[];
}

function buildVideoFileMap(files: FileList | File[]): Map<string, File> {
  const map = new Map<string, File>();

  for (const file of Array.from(files)) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "mp4" || file.type.startsWith("video/")) {
      map.set(file.name.toLowerCase(), file);
    }
  }

  return map;
}

export async function restoreShowFromFile(
  showFile: CueDirectorFile,
  mediaFiles: FileList | File[],
): Promise<RestoreShowResult> {
  const videoMap = buildVideoFileMap(mediaFiles);
  const { csvs, cues: cuesByBaseName } = indexMediaFilesByBaseName(mediaFiles);
  const missingVideoFiles: string[] = [];
  const playlist: Song[] = [];

  for (const entry of showFile.playlist) {
    const videoFile = videoMap.get(entry.videoFilename.toLowerCase());
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
        videoUrl: "",
        cues,
      });
      continue;
    }

    playlist.push({
      id: entry.id,
      title: entry.title,
      videoFilename: entry.videoFilename,
      videoUrl: URL.createObjectURL(videoFile),
      cues,
    });
  }

  return {
    showInfo: showFile.showInfo,
    preferences: showFile.preferences,
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
