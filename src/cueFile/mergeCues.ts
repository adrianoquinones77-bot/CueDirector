import { cuesFromCueFile, parseCueFile } from "./parseCueFile";
import type { Cue } from "../types/cue";

export function mergeCuesWithEditorFile(
  csvCues: Cue[],
  editorFileContent: string,
): Cue[] {
  try {
    const cueFile = parseCueFile(editorFileContent);
    return cuesFromCueFile(cueFile);
  } catch {
    return csvCues;
  }
}
