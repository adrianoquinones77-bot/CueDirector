import { parseCueCsv } from "./parseCueCsv";
import type { Song } from "./types/song";

function getBaseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function formatSongTitle(baseName: string): string {
  return baseName.replace(/^\d+\s*/, "").trim() || baseName;
}

export async function buildPlaylistFromFiles(files: FileList | File[]): Promise<Song[]> {
  const pairs = new Map<string, { video?: File; csv?: File }>();

  for (const file of Array.from(files)) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    const baseName = getBaseName(file.name);
    const entry = pairs.get(baseName) ?? {};

    if (extension === "mp4" || file.type.startsWith("video/")) {
      entry.video = file;
    } else if (extension === "csv") {
      entry.csv = file;
    }

    pairs.set(baseName, entry);
  }

  const songs: Song[] = [];

  for (const [baseName, { video, csv }] of pairs) {
    if (!video || !csv) continue;

    const cues = parseCueCsv(await csv.text());
    if (cues.length === 0) continue;

    songs.push({
      id: baseName,
      title: formatSongTitle(baseName),
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
