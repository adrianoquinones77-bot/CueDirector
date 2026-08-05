import { mergeCuesWithEditorFile } from "../cueFile/mergeCues";
import { getMediaBaseName } from "../cueFile/loadSongCues";
import { parseCueCsv } from "../parseCueCsv";
import type { ElectronMediaFile } from "../types/electron";
import type { CueDirectorFile } from "../types/cueDirectorFile";
import type { Cue } from "../types/cue";
import {
  makeMediaId,
  type RuntimeShowMediaItem,
} from "../types/showMedia";
import type { Song } from "../types/song";
import {
  buildMediaLibraryFromPlaylist,
  mergeMediaLibraries,
} from "./mediaLibrary";
import {
  getMediaPathCandidates,
  logMediaRestore,
  logShowRestore,
} from "./showMediaPaths";
import {
  restoreShowFromFile,
  type RestoreShowResult,
} from "./restoreShowFile";

function formatSongTitle(baseName: string): string {
  return baseName.replace(/^\d+\s*/, "").trim() || baseName;
}

function indexElectronMedia(files: ElectronMediaFile[]) {
  const videos = new Map<string, ElectronMediaFile>();
  const csvs = new Map<string, ElectronMediaFile>();
  const cues = new Map<string, ElectronMediaFile>();

  for (const file of files) {
    const lower = file.name.toLowerCase();
    const baseNameKey = getMediaBaseName(file.name).toLowerCase();

    if (
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v")
    ) {
      videos.set(baseNameKey, file);
      continue;
    }

    if (lower.endsWith(".csv")) {
      csvs.set(baseNameKey, file);
      continue;
    }

    if (lower.endsWith(".cues")) {
      cues.set(baseNameKey, file);
    }
  }

  return { videos, csvs, cues };
}

function indexVideosByFilename(
  files: ElectronMediaFile[],
): Map<string, ElectronMediaFile> {
  const map = new Map<string, ElectronMediaFile>();

  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".m4v")
    ) {
      map.set(lower, file);
    }
  }

  return map;
}

function indexVideosByRelativePath(
  files: ElectronMediaFile[],
): Map<string, ElectronMediaFile> {
  const map = new Map<string, ElectronMediaFile>();

  for (const file of files) {
    map.set(file.relativePath.replace(/\\/g, "/").toLowerCase(), file);
  }

  return map;
}

function resolveVideoFile(
  entry: CueDirectorFile["playlist"][number],
  byFilename: Map<string, ElectronMediaFile>,
  byRelativePath: Map<string, ElectronMediaFile>,
): ElectronMediaFile | undefined {
  if (entry.videoRelativePath) {
    const byPath = byRelativePath.get(
      entry.videoRelativePath.replace(/\\/g, "/").toLowerCase(),
    );
    if (byPath) return byPath;
  }

  return byFilename.get(entry.videoFilename.toLowerCase());
}

async function loadSongCuesFromElectron(
  csvFile: ElectronMediaFile | undefined,
  cuesFile: ElectronMediaFile | undefined,
  fallbackCues: Cue[],
): Promise<Cue[]> {
  const api = window.electronAPI!;
  let cues = fallbackCues;

  if (csvFile) {
    cues = parseCueCsv(await api.readTextFile(csvFile.absolutePath));
  }

  if (cuesFile) {
    cues = mergeCuesWithEditorFile(
      cues,
      await api.readTextFile(cuesFile.absolutePath),
    );
  }

  return cues;
}

export async function buildPlaylistFromElectronDirectory(
  mediaDirectoryPath: string,
): Promise<Song[]> {
  const api = window.electronAPI!;
  const files = await api.collectMediaFromDirectory(mediaDirectoryPath);
  const { videos, csvs, cues } = indexElectronMedia(files);
  const songs: Song[] = [];

  for (const [baseNameKey, video] of videos) {
    const baseName = getMediaBaseName(video.name);
    const loadedCues = await loadSongCuesFromElectron(
      csvs.get(baseNameKey),
      cues.get(baseNameKey),
      [],
    );

    songs.push({
      id: baseName,
      title: formatSongTitle(baseName),
      videoFilename: video.name,
      videoRelativePath: video.relativePath.replace(/\\/g, "/"),
      videoUrl: await api.pathToFileUrl(video.absolutePath),
      cues: loadedCues,
    });
  }

  return songs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

export interface ElectronRestoreResult extends RestoreShowResult {
  mediaDirectoryPath?: string;
  mediaDirectoryFound: boolean;
}

/** Shared Electron restore: try saved media path candidates, then validate each video. */
export async function tryRestoreElectronShow(
  showFile: CueDirectorFile,
  options?: {
    showFilePath?: string;
    preferredMediaPath?: string;
  },
): Promise<ElectronRestoreResult> {
  const api = window.electronAPI!;
  const savedPath =
    options?.preferredMediaPath?.trim() ??
    showFile.mediaDirectoryPath?.trim() ??
    "(none)";

  logMediaRestore({ savedPath });

  const candidates = getMediaPathCandidates(showFile, options?.showFilePath);
  if (options?.preferredMediaPath?.trim()) {
    const preferred = options.preferredMediaPath.trim();
    const rest = candidates.filter((candidate) => candidate !== preferred);
    candidates.length = 0;
    candidates.push(preferred, ...rest);
  }

  for (const candidate of candidates) {
    const exists = await api.pathExists(candidate);
    logMediaRestore({
      savedPath,
      resolvedPath: candidate,
      exists,
    });

    if (!exists) continue;

    const result = await restoreShowFromElectronDirectory(showFile, candidate);
    logMediaRestore({
      savedPath,
      resolvedPath: candidate,
      exists: true,
      missingFiles: result.missingVideoFiles,
    });

    return {
      ...result,
      mediaDirectoryPath: candidate,
      mediaDirectoryFound: true,
    };
  }

  const result = await restoreShowFromFile(showFile, []);
  logMediaRestore({
    savedPath,
    resolvedPath: "(none)",
    exists: false,
    missingFiles: result.missingVideoFiles,
  });

  return {
    ...result,
    mediaDirectoryFound: false,
  };
}

export async function restoreShowFromElectronDirectory(
  showFile: CueDirectorFile,
  mediaDirectoryPath: string,
): Promise<RestoreShowResult> {
  const api = window.electronAPI!;

  logShowRestore("Saved media path from .show", showFile.mediaDirectoryPath ?? "(none)");
  logShowRestore("Searching media at path", mediaDirectoryPath);

  const mediaFiles = await api.collectMediaFromDirectory(mediaDirectoryPath);
  const videoFiles = await api.collectVideosRecursively(mediaDirectoryPath);
  const { csvs, cues: cuesByBaseName } = indexElectronMedia(mediaFiles);
  const videosByFilename = indexVideosByFilename(videoFiles);
  const videosByRelativePath = indexVideosByRelativePath(videoFiles);

  const missingVideoFiles: string[] = [];
  const playlist: Song[] = [];

  for (const entry of showFile.playlist) {
    const videoFile = resolveVideoFile(
      entry,
      videosByFilename,
      videosByRelativePath,
    );
    const baseNameKey = entry.id.toLowerCase();
    const songCues = await loadSongCuesFromElectron(
      csvs.get(baseNameKey),
      cuesByBaseName.get(baseNameKey),
      entry.cues,
    );

    if (!videoFile) {
      logMediaRestore({
        savedPath: showFile.mediaDirectoryPath ?? "(none)",
        resolvedPath: entry.videoRelativePath ?? entry.videoFilename,
        exists: false,
        videoFilename: entry.videoFilename,
      });
      missingVideoFiles.push(entry.videoFilename);
      playlist.push({
        id: entry.id,
        title: entry.title,
        videoFilename: entry.videoFilename,
        videoRelativePath: entry.videoRelativePath,
        videoUrl: "",
        cues: songCues,
        ...(entry.link ? { link: entry.link } : {}),
        ...(entry.setList ? { setList: entry.setList } : {}),
      });
      continue;
    }

    const resolvedPath = videoFile.absolutePath;
    const exists = await api.pathExists(resolvedPath);

    logMediaRestore({
      savedPath: showFile.mediaDirectoryPath ?? "(none)",
      resolvedPath,
      exists,
      videoFilename: entry.videoFilename,
    });

    if (!exists) {
      missingVideoFiles.push(entry.videoFilename);
      playlist.push({
        id: entry.id,
        title: entry.title,
        videoFilename: entry.videoFilename,
        videoRelativePath: entry.videoRelativePath,
        videoUrl: "",
        cues: songCues,
        ...(entry.link ? { link: entry.link } : {}),
        ...(entry.setList ? { setList: entry.setList } : {}),
      });
      continue;
    }

    const videoUrl = await api.pathToFileUrl(resolvedPath);

    playlist.push({
      id: entry.id,
      title: entry.title,
      videoFilename: videoFile.name,
      videoRelativePath: videoFile.relativePath.replace(/\\/g, "/"),
      videoUrl,
      cues: songCues,
      ...(entry.link ? { link: entry.link } : {}),
      ...(entry.setList ? { setList: entry.setList } : {}),
    });
  }

  const libraryFromDisk: RuntimeShowMediaItem[] = [];
  for (const video of videoFiles) {
    const relativePath = video.relativePath.replace(/\\/g, "/");
    libraryFromDisk.push({
      id: makeMediaId(video.name, relativePath),
      filename: video.name,
      relativePath,
      url: await api.pathToFileUrl(video.absolutePath),
    });
  }

  for (const saved of showFile.mediaLibrary ?? []) {
    if (libraryFromDisk.some((item) => item.id === saved.id)) continue;
    const file =
      (saved.relativePath &&
        videosByRelativePath.get(saved.relativePath.replace(/\\/g, "/").toLowerCase())) ||
      videosByFilename.get(saved.filename.toLowerCase());
    if (!file) {
      missingVideoFiles.push(saved.filename);
      continue;
    }
    const exists = await api.pathExists(file.absolutePath);
    if (!exists) {
      missingVideoFiles.push(saved.filename);
      continue;
    }
    libraryFromDisk.push({
      id: saved.id,
      filename: file.name,
      relativePath: file.relativePath.replace(/\\/g, "/"),
      url: await api.pathToFileUrl(file.absolutePath),
    });
  }

  const mediaLibrary = mergeMediaLibraries(
    libraryFromDisk,
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
