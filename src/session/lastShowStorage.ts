import {
  LAST_SHOW_SESSION_VERSION,
  LAST_SHOW_STORAGE_KEY,
  type LastShowSession,
} from "../types/lastShowSession";
import { clearLastShowPlaybackPosition } from "./lastShowPlaybackPositionStorage";
import { isElectronSessionStorage } from "./sessionStorageEnv";

export { isElectronSessionStorage } from "./sessionStorageEnv";

function isValidSession(value: unknown): value is LastShowSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<LastShowSession>;
  return (
    session.version === LAST_SHOW_SESSION_VERSION &&
    typeof session.savedAt === "string" &&
    session.show !== undefined &&
    typeof session.show === "object" &&
    typeof session.activeSongIndex === "number" &&
    typeof session.currentTime === "number" &&
    typeof session.timelineZoom === "number"
  );
}

export async function loadLastShowSession(): Promise<LastShowSession | null> {
  try {
    if (isElectronSessionStorage()) {
      const session = await window.electronAPI!.loadLastShow();
      return isValidSession(session) ? session : null;
    }

    const raw = localStorage.getItem(LAST_SHOW_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLastShowSession(
  session: LastShowSession,
): Promise<void> {
  if (isElectronSessionStorage()) {
    await window.electronAPI!.saveLastShow(session);
    return;
  }

  localStorage.setItem(LAST_SHOW_STORAGE_KEY, JSON.stringify(session));
}

export async function clearLastShowSession(): Promise<void> {
  if (isElectronSessionStorage()) {
    // Electron clear removes both the show session and playback position files.
    await window.electronAPI!.clearLastShow();
    return;
  }

  localStorage.removeItem(LAST_SHOW_STORAGE_KEY);
  await clearLastShowPlaybackPosition();
}
