import {
  LAST_SHOW_PLAYBACK_POSITION_KEY,
  LAST_SHOW_PLAYBACK_POSITION_VERSION,
  type LastShowPlaybackPosition,
} from "../types/lastShowPlaybackPosition";
import { isElectronSessionStorage } from "./sessionStorageEnv";

function isValidPosition(value: unknown): value is LastShowPlaybackPosition {
  if (!value || typeof value !== "object") return false;

  const position = value as Partial<LastShowPlaybackPosition>;
  return (
    position.version === LAST_SHOW_PLAYBACK_POSITION_VERSION &&
    typeof position.savedAt === "string" &&
    typeof position.activeSongIndex === "number" &&
    typeof position.currentTime === "number"
  );
}

export function buildPlaybackPosition(
  activeSongIndex: number,
  currentTime: number,
): LastShowPlaybackPosition {
  return {
    version: LAST_SHOW_PLAYBACK_POSITION_VERSION,
    savedAt: new Date().toISOString(),
    activeSongIndex,
    currentTime,
  };
}

export async function loadLastShowPlaybackPosition(): Promise<LastShowPlaybackPosition | null> {
  try {
    if (isElectronSessionStorage()) {
      const position = await window.electronAPI!.loadLastShowPlaybackPosition();
      return isValidPosition(position) ? position : null;
    }

    const raw = localStorage.getItem(LAST_SHOW_PLAYBACK_POSITION_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isValidPosition(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLastShowPlaybackPosition(
  position: LastShowPlaybackPosition,
): Promise<void> {
  if (isElectronSessionStorage()) {
    await window.electronAPI!.saveLastShowPlaybackPosition(position);
    return;
  }

  localStorage.setItem(
    LAST_SHOW_PLAYBACK_POSITION_KEY,
    JSON.stringify(position),
  );
}

export async function clearLastShowPlaybackPosition(): Promise<void> {
  if (isElectronSessionStorage()) {
    await window.electronAPI!.clearLastShowPlaybackPosition();
    return;
  }

  localStorage.removeItem(LAST_SHOW_PLAYBACK_POSITION_KEY);
}
