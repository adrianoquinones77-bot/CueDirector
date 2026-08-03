import { buildPlaylistFromFiles } from "../buildPlaylist";
import { getMediaBaseName } from "../cueFile/loadSongCues";
import type { Song } from "../types/song";

export function supportsMediaDirectoryPicker(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickMediaDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsMediaDirectoryPicker()) return null;

  try {
    return await window.showDirectoryPicker({ mode: "readwrite" });
  } catch {
    return null;
  }
}

export async function collectFilesFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  relativePrefix = "",
): Promise<{
  files: File[];
  cuesFileHandles: Map<string, FileSystemFileHandle>;
}> {
  const files: File[] = [];
  const cuesFileHandles = new Map<string, FileSystemFileHandle>();

  for await (const entry of directoryHandle.values()) {
    const entryPath = relativePrefix
      ? `${relativePrefix}/${entry.name}`
      : entry.name;

    if (entry.kind === "file") {
      const handle = entry as FileSystemFileHandle;
      const file = await handle.getFile();
      attachRelativePath(file, entryPath);
      files.push(file);

      if (file.name.toLowerCase().endsWith(".cues")) {
        cuesFileHandles.set(getMediaBaseName(file.name).toLowerCase(), handle);
      }
      continue;
    }

    if (entry.kind === "directory") {
      const nested = await collectFilesFromDirectory(
        entry as FileSystemDirectoryHandle,
        entryPath,
      );
      files.push(...nested.files);
      nested.cuesFileHandles.forEach((handle, key) => {
        cuesFileHandles.set(key, handle);
      });
    }
  }

  return { files, cuesFileHandles };
}

function attachRelativePath(file: File, relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    "webkitRelativePath" in file &&
    typeof file.webkitRelativePath === "string" &&
    file.webkitRelativePath
  ) {
    return;
  }

  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: normalized,
      configurable: true,
    });
  } catch {
    // Some runtimes disallow defining properties on File objects.
  }
}

export async function buildPlaylistFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
): Promise<{
  songs: Song[];
  cuesFileHandles: Map<string, FileSystemFileHandle>;
}> {
  const { files, cuesFileHandles } =
    await collectFilesFromDirectory(directoryHandle);
  const songs = await buildPlaylistFromFiles(files);

  return { songs, cuesFileHandles };
}
