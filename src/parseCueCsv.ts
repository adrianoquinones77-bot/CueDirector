import type { Cue } from "./types/cue";

function parseCsvRow(line: string): string[] | null {
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

  return fields;
}

function isHeaderRow(time: string, text: string): boolean {
  const t = time.toLowerCase();
  const c = text.toLowerCase();

  return (
    t === "time" &&
    (c === "cue" || c === "action")
  );
}

function parseTime(value: string): number {
  const clean = value.trim();

  if (!clean.includes(":")) {
    return Number(clean);
  }

  const parts = clean.split(":").map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return NaN;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return NaN;
}

function isLiveRow(text: string): boolean {
  return text.trim().toLowerCase() === "live";
}

export function parseCueCsv(content: string): Cue[] {
  const cues: Cue[] = [];

  for (const line of content.replace(/^\uFEFF/, "").trim().split(/\r?\n/)) {
    if (!line.trim()) continue;

    const fields = parseCsvRow(line);
    if (!fields) continue;

    const [timeRaw, textRaw, durationRaw] = fields;

    if (isHeaderRow(timeRaw, textRaw)) continue;

    const time = parseTime(timeRaw);
    const text = textRaw.trim();

    if (Number.isNaN(time) || !text || isLiveRow(text)) continue;

    const cue: Cue = {
      time,
      text,
    };

    if (durationRaw?.trim()) {
      const duration = Number(durationRaw);

      if (!Number.isNaN(duration) && duration > 0) {
        cue.duration = duration;
      }
    }

    cues.push(cue);
  }

  return cues.sort((a, b) => a.time - b.time);
}