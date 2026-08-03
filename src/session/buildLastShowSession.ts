import { buildCueDirectorFile } from "../showFile/saveShowFile";
import {
  LAST_SHOW_SESSION_VERSION,
  type LastShowSession,
} from "../types/lastShowSession";
import type { ShowInfo } from "../types/showInfo";
import type { Song } from "../types/song";

interface BuildLastShowSessionInput {
  showInfo: ShowInfo;
  autoAdvance: boolean;
  defaultCueDuration: number;
  playlist: Song[];
  activeSongIndex: number;
  currentTime: number;
  timelineZoom: number;
  mediaDirectoryPath?: string;
  showFilePath?: string;
}

export function buildLastShowSession(
  input: BuildLastShowSessionInput,
): LastShowSession {
  return {
    version: LAST_SHOW_SESSION_VERSION,
    savedAt: new Date().toISOString(),
    mediaDirectoryPath: input.mediaDirectoryPath,
    showFilePath: input.showFilePath,
    show: buildCueDirectorFile({
      showInfo: input.showInfo,
      autoAdvance: input.autoAdvance,
      defaultCueDuration: input.defaultCueDuration,
      timelineZoom: input.timelineZoom,
      mediaDirectoryPath: input.mediaDirectoryPath,
      playlist: input.playlist,
    }),
    activeSongIndex: input.activeSongIndex,
    currentTime: input.currentTime,
    timelineZoom: input.timelineZoom,
  };
}
