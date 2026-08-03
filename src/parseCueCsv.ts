import type { Cue } from "./types/cue";

function parseCsvRow(line: string): [string, string] | null {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current.trim());

  if (fields.length < 2) return null;

  return [fields[0], fields[1]];
}

function isHeaderRow(time: string, text: string): boolean {
  return time.toLowerCase() === "time" && text.toLowerCase() === "cue";
}

export function parseCueCsv(content: string): Cue[] {
  const cues: Cue[] = [];

  for (const line of content.replace(/^\uFEFF/, "").trim().split(/\r?\n/)) {
    if (!line.trim()) continue;

    const row = parseCsvRow(line);
    if (!row) continue;

    const [timeRaw, textRaw] = row;
    if (isHeaderRow(timeRaw, textRaw)) continue;

    const time = Number(timeRaw);
    const text = textRaw.trim();

    if (Number.isNaN(time) || !text) continue;

    cues.push({ time, text });
  }

  return cues.sort((a, b) => a.time - b.time);
}
