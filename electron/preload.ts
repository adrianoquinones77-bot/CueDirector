import { contextBridge, ipcRenderer } from "electron";
import type { LastShowPlaybackPosition } from "../src/types/lastShowPlaybackPosition";
import type { LastShowSession } from "../src/types/lastShowSession";

contextBridge.exposeInMainWorld("electronAPI", {
  loadLastShow: (): Promise<LastShowSession | null> =>
    ipcRenderer.invoke("session:load"),
  saveLastShow: (session: LastShowSession): Promise<void> =>
    ipcRenderer.invoke("session:save", session),
  clearLastShow: (): Promise<void> => ipcRenderer.invoke("session:clear"),
  loadLastShowPlaybackPosition: (): Promise<LastShowPlaybackPosition | null> =>
    ipcRenderer.invoke("session:loadPlaybackPosition"),
  saveLastShowPlaybackPosition: (
    position: LastShowPlaybackPosition,
  ): Promise<void> => ipcRenderer.invoke("session:savePlaybackPosition", position),
  clearLastShowPlaybackPosition: (): Promise<void> =>
    ipcRenderer.invoke("session:clearPlaybackPosition"),
  pickMediaDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:pickMediaDirectory"),
  collectMediaFromDirectory: (directoryPath: string) =>
    ipcRenderer.invoke("media:collect", directoryPath),
  collectVideosRecursively: (directoryPath: string) =>
    ipcRenderer.invoke("media:collectVideosRecursively", directoryPath),
  pathToFileUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("path:fileUrl", filePath),
  readTextFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("fs:readText", filePath),
  writeTextFile: (filePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke("fs:writeText", filePath, content),
  pathExists: (targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke("fs:pathExists", targetPath),
});
