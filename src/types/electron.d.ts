import type { LastShowSession } from "./lastShowSession";

export interface ElectronMediaFile {
  name: string;
  absolutePath: string;
  relativePath: string;
}

export interface ElectronAPI {
  loadLastShow: () => Promise<LastShowSession | null>;
  saveLastShow: (session: LastShowSession) => Promise<void>;
  clearLastShow: () => Promise<void>;
  pickMediaDirectory: () => Promise<string | null>;
  collectMediaFromDirectory: (
    directoryPath: string,
  ) => Promise<ElectronMediaFile[]>;
  collectVideosRecursively: (
    directoryPath: string,
  ) => Promise<ElectronMediaFile[]>;
  pathToFileUrl: (filePath: string) => Promise<string>;
  readTextFile: (filePath: string) => Promise<string>;
  writeTextFile: (filePath: string, content: string) => Promise<void>;
  pathExists: (targetPath: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
