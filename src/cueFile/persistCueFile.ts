import type { Song } from "../types/song";
import { buildCueFile, downloadCueFile } from "./saveCueFile";

export function getCueFileName(songId: string): string {
  return `${songId}.cues`;
}

export function getCueFileNameForSong(song: Pick<Song, "id">): string {
  return `${song.id}.cues`;
}

export function serializeCueFile(song: Song): string {
  return JSON.stringify(buildCueFile(song), null, 2);
}

export async function writeCueFileToHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function writeSongCueFile(
  song: Song,
  handle: FileSystemFileHandle,
): Promise<void> {
  await writeCueFileToHandle(handle, serializeCueFile(song));
}

export async function createSongCueFile(
  song: Song,
  directoryHandle: FileSystemDirectoryHandle,
): Promise<FileSystemFileHandle> {
  const handle = await directoryHandle.getFileHandle(getCueFileNameForSong(song), {
    create: true,
  });
  await writeSongCueFile(song, handle);
  return handle;
}

export async function updateSongCueFile(
  song: Song,
  handle: FileSystemFileHandle,
): Promise<void> {
  await writeSongCueFile(song, handle);
}

export function downloadSongCueFile(song: Song): void {
  downloadCueFile(song);
}

export function getSaveCueErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Permission denied. Allow folder access to save cue files.";
    }
    return error.message || "Could not save cue file.";
  }

  if (error instanceof Error) {
    return error.message || "Could not save cue file.";
  }

  return "Could not save cue file.";
}
