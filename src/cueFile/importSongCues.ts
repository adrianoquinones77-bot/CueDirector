import type { Cue } from "../types/cue";
import { cuesFromCueFile, parseCueFile } from "./parseCueFile";

export type ImportCueMode = "replace" | "merge";

function cueIdentityKey(cue: Cue): string {
  return [
    cue.time.toFixed(3),
    cue.text,
    cue.emoji ?? "",
    cue.type ?? "",
    cue.duration ?? "",
    cue.videoId ?? "",
    cue.important === true ? "1" : "0",
  ].join("\0");
}

/** Union existing + imported cues; exact duplicates are skipped. */
export function mergeImportedCues(
  existing: Cue[],
  imported: Cue[],
): Cue[] {
  const seen = new Set(existing.map(cueIdentityKey));
  const merged = existing.slice();

  for (const cue of imported) {
    const key = cueIdentityKey(cue);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ ...cue });
  }

  return merged;
}

export function resolveImportedCues(
  existing: Cue[],
  imported: Cue[],
  mode: ImportCueMode,
): Cue[] {
  if (mode === "replace") {
    return imported.map((cue) => ({ ...cue }));
  }
  return mergeImportedCues(existing, imported);
}

/** Parse a CueDirector .cues / .cue file into runtime Cue objects. */
export function parseImportedCueFile(content: string): Cue[] {
  const cueFile = parseCueFile(content);
  return cuesFromCueFile(cueFile);
}
