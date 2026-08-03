import {
  getMediaBaseName,
  indexMediaFilesByBaseName,
  loadSongCues,
} from "./cueFile/loadSongCues";
import type { Song } from "./types/song";

function formatSongTitle(baseName: string): string {
  return baseName.replace(/^\d+\s*/, "").trim() || baseName;
}

export async function buildPlaylistFromFiles(files: FileList | File[]): Promise<Song[]> {
  const { videos, csvs, cues: cuesByBaseName } = indexMediaFilesByBaseName(files);
  const songs: Song[] = [];

  for (const [baseNameKey, video] of videos) {
    const baseName = getMediaBaseName(video.name);
    const cues = await loadSongCues({
      csvFile: csvs.get(baseNameKey),
      cuesFile: cuesByBaseName.get(baseNameKey),
    });

    songs.push({
      id: baseName,
      title: formatSongTitle(baseName),
      videoFilename: video.name,
      videoUrl: URL.createObjectURL(video),
      cues,
    });
  }

  return songs.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

export function revokePlaylistUrls(playlist: Song[]): void {
  for (const song of playlist) {
    URL.revokeObjectURL(song.videoUrl);
  }
}
