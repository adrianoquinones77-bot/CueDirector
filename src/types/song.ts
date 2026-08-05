import type { Cue } from "./cue";
import type { SongLink } from "./songLink";
import type { SongSetList } from "./songSetList";

export interface Song {
  id: string;
  title: string;
  videoFilename: string;
  /** Path to the video relative to the linked media folder. */
  videoRelativePath?: string;
  videoUrl: string;
  cues: Cue[];
  /**
   * Optional automatic playback handoff to another playlist song.
   * Does not merge songs/cues — only chains end → next.
   */
  link?: SongLink;
  /** Display-only set list metadata (names, medleys, duration). */
  setList?: SongSetList;
}

export type AdvanceOnEndResult = {
  advanced: boolean;
  /** When true, the player should auto-play the newly loaded song. */
  autoPlay: boolean;
};
