import type { Song } from "../types/song";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v"]);

export interface VideoLocation {
  filename: string;
  relativePath: string;
  absolutePath?: string;
  file?: File;
}

export function isVideoFilename(filename: string): boolean {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.has(extension);
}

export function indexVideosByFilename(
  locations: VideoLocation[],
): Map<string, VideoLocation> {
  const index = new Map<string, VideoLocation>();

  for (const location of locations) {
    index.set(location.filename.toLowerCase(), location);
  }

  return index;
}

export async function relinkMissingVideos(
  playlist: Song[],
  missingFilenames: string[],
  index: Map<string, VideoLocation>,
  createVideoUrl: (location: VideoLocation) => Promise<string>,
): Promise<{ playlist: Song[]; stillMissing: string[] }> {
  const missingSet = new Set(
    missingFilenames.map((filename) => filename.toLowerCase()),
  );
  const stillMissing = new Set<string>();

  const updatedPlaylist = await Promise.all(
    playlist.map(async (song) => {
      const needsRelink =
        !song.videoUrl || missingSet.has(song.videoFilename.toLowerCase());

      if (!needsRelink) return song;

      const location = index.get(song.videoFilename.toLowerCase());
      if (!location) {
        if (!song.videoUrl) stillMissing.add(song.videoFilename);
        return song;
      }

      return {
        ...song,
        videoFilename: location.filename,
        videoRelativePath: location.relativePath,
        videoUrl: await createVideoUrl(location),
      };
    }),
  );

  return {
    playlist: updatedPlaylist,
    stillMissing: [...stillMissing],
  };
}

export async function collectVideosFromDirectoryHandle(
  directoryHandle: FileSystemDirectoryHandle,
  relativePrefix = "",
): Promise<VideoLocation[]> {
  const locations: VideoLocation[] = [];

  for await (const entry of directoryHandle.values()) {
    const entryPath = relativePrefix
      ? `${relativePrefix}/${entry.name}`
      : entry.name;

    if (entry.kind === "file") {
      const file = await (entry as FileSystemFileHandle).getFile();
      if (!isVideoFilename(file.name)) continue;

      locations.push({
        filename: file.name,
        relativePath: entryPath.replace(/\\/g, "/"),
        file,
      });
      continue;
    }

    if (entry.kind === "directory") {
      locations.push(
        ...(await collectVideosFromDirectoryHandle(
          entry as FileSystemDirectoryHandle,
          entryPath,
        )),
      );
    }
  }

  return locations;
}

export function collectVideosFromFileList(
  files: FileList | File[],
): VideoLocation[] {
  const locations: VideoLocation[] = [];

  for (const file of Array.from(files)) {
    if (!isVideoFilename(file.name)) continue;

    const relativePath =
      "webkitRelativePath" in file &&
      typeof file.webkitRelativePath === "string" &&
      file.webkitRelativePath
        ? file.webkitRelativePath.replace(/\\/g, "/")
        : file.name;

    locations.push({
      filename: file.name,
      relativePath,
      file,
    });
  }

  return locations;
}

export function pickMediaFolderViaInput(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.style.display = "none";

    input.addEventListener(
      "change",
      () => {
        resolve(input.files && input.files.length > 0 ? input.files : null);
        input.remove();
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        resolve(null);
        input.remove();
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

/** Pick one or more video files (not a folder) for the show media library. */
export function pickVideoFilesViaInput(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "video/*,.mp4,.mov,.m4v";
    input.style.display = "none";

    input.addEventListener(
      "change",
      () => {
        resolve(input.files && input.files.length > 0 ? input.files : null);
        input.remove();
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        resolve(null);
        input.remove();
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}
