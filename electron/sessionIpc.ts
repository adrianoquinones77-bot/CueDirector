import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { app, ipcMain } from "electron";
import type { LastShowPlaybackPosition } from "../src/types/lastShowPlaybackPosition";
import type { LastShowSession } from "../src/types/lastShowSession";
import { absolutePathToMediaUrl } from "./mediaProtocol";
import { collectMediaFromDirectory, collectVideosRecursively } from "./mediaScanner";

const SESSION_FILENAME = "last-show.json";
const PLAYBACK_POSITION_FILENAME = "last-show-position.json";

function getSessionPath(): string {
  return path.join(app.getPath("userData"), SESSION_FILENAME);
}

function getPlaybackPositionPath(): string {
  return path.join(app.getPath("userData"), PLAYBACK_POSITION_FILENAME);
}

async function readSession(): Promise<LastShowSession | null> {
  try {
    const raw = await fs.readFile(getSessionPath(), "utf8");
    return JSON.parse(raw) as LastShowSession;
  } catch {
    return null;
  }
}

async function writeSession(session: LastShowSession): Promise<void> {
  await fs.mkdir(path.dirname(getSessionPath()), { recursive: true });
  await fs.writeFile(getSessionPath(), JSON.stringify(session, null, 2), "utf8");
}

async function deleteSession(): Promise<void> {
  try {
    await fs.unlink(getSessionPath());
  } catch {
    // Ignore missing session file.
  }
}

async function readPlaybackPosition(): Promise<LastShowPlaybackPosition | null> {
  try {
    const raw = await fs.readFile(getPlaybackPositionPath(), "utf8");
    return JSON.parse(raw) as LastShowPlaybackPosition;
  } catch {
    return null;
  }
}

async function writePlaybackPosition(
  position: LastShowPlaybackPosition,
): Promise<void> {
  await fs.mkdir(path.dirname(getPlaybackPositionPath()), { recursive: true });
  await fs.writeFile(
    getPlaybackPositionPath(),
    JSON.stringify(position),
    "utf8",
  );
}

async function deletePlaybackPosition(): Promise<void> {
  try {
    await fs.unlink(getPlaybackPositionPath());
  } catch {
    // Ignore missing position file.
  }
}

export function registerSessionIpc(): void {
  ipcMain.handle("session:load", () => readSession());

  ipcMain.handle("session:save", (_event, session: LastShowSession) =>
    writeSession(session),
  );

  ipcMain.handle("session:clear", async () => {
    await deleteSession();
    await deletePlaybackPosition();
  });

  ipcMain.handle("session:loadPlaybackPosition", () => readPlaybackPosition());

  ipcMain.handle(
    "session:savePlaybackPosition",
    (_event, position: LastShowPlaybackPosition) => writePlaybackPosition(position),
  );

  ipcMain.handle("session:clearPlaybackPosition", () => deletePlaybackPosition());

  ipcMain.handle("media:collect", (_event, directoryPath: string) =>
    collectMediaFromDirectory(directoryPath),
  );

  ipcMain.handle("media:collectVideosRecursively", (_event, directoryPath: string) =>
    collectVideosRecursively(directoryPath),
  );

  ipcMain.handle("fs:writeText", (_event, filePath: string, content: string) =>
    fs.writeFile(filePath, content, "utf8"),
  );

  ipcMain.handle("path:fileUrl", (_event, filePath: string) =>
    absolutePathToMediaUrl(filePath),
  );

  ipcMain.handle("fs:readText", (_event, filePath: string) =>
    fs.readFile(filePath, "utf8"),
  );

  ipcMain.handle("fs:pathExists", async (_event, targetPath: string) => {
    const exists = fsSync.existsSync(targetPath);
    console.log("[CueDirector media] pathExists", { targetPath, exists });

    if (exists) {
      return true;
    }

    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  });
}

export async function pickMediaDirectoryNative(): Promise<string | null> {
  const { dialog, BrowserWindow } = await import("electron");
  const window = BrowserWindow.getFocusedWindow();

  const dialogOptions = {
    properties: ["openDirectory" as const],
    title: "Select Show Media Folder",
  };

  const result = window
    ? await dialog.showOpenDialog(window, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0] ?? null;
}

export async function pickSaveShowPathNative(options?: {
  defaultPath?: string;
}): Promise<string | null> {
  const { dialog, BrowserWindow } = await import("electron");
  const window = BrowserWindow.getFocusedWindow();

  const dialogOptions = {
    title: "Save Show As",
    defaultPath: options?.defaultPath,
    filters: [
      { name: "CueDirector Show", extensions: ["show"] },
      { name: "Legacy CueDirector", extensions: ["cuedirector"] },
    ],
  };

  const result = window
    ? await dialog.showSaveDialog(window, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
}

export function registerDialogIpc(): void {
  ipcMain.handle("dialog:pickMediaDirectory", () => pickMediaDirectoryNative());
  ipcMain.handle(
    "dialog:pickSaveShowPath",
    (_event, options?: { defaultPath?: string }) =>
      pickSaveShowPathNative(options),
  );
}
