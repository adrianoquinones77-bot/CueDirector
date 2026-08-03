import type { Cue } from "./cue";

export interface Song {
  id: string;
  title: string;
  videoFilename: string;
  /** Path to the video relative to the linked media folder. */
  videoRelativePath?: string;
  videoUrl: string;
  cues: Cue[];
}
