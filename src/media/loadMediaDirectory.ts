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
): Promise<{
  files: File[];
  cuesFileHandles: Map<string, FileSystemFileHandle>;
}> {
  const files: File[] = [];
  const cuesFileHandles = new Map<string, FileSystemFileHandle>();

  for await (const entry of directoryHandle.values()) {
    if (entry.kind !== "file") continue;

    const handle = entry as FileSystemFileHandle;
    const file = await handle.getFile();
    files.push(file);

    if (file.name.toLowerCase().endsWith(".cues")) {
      cuesFileHandles.set(getMediaBaseName(file.name).toLowerCase(), handle);
    }
  }

  return { files, cuesFileHandles };
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
