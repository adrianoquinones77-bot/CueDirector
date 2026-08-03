import fs from "node:fs/promises";
import path from "node:path";

export interface ScannedMediaFile {
  name: string;
  absolutePath: string;
  relativePath: string;
}

const MEDIA_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".csv",
  ".cues",
  ".show",
  ".cuedirector",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v"]);

function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function collectVideosRecursively(
  directoryPath: string,
): Promise<ScannedMediaFile[]> {
  const files: ScannedMediaFile[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !isVideoFile(entry.name)) continue;

      files.push({
        name: entry.name,
        absolutePath,
        relativePath: path.relative(directoryPath, absolutePath),
      });
    }
  }

  await walk(directoryPath);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function collectMediaFromDirectory(
  directoryPath: string,
): Promise<ScannedMediaFile[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files: ScannedMediaFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!MEDIA_EXTENSIONS.has(extension)) continue;

    const absolutePath = path.join(directoryPath, entry.name);
    files.push({
      name: entry.name,
      absolutePath,
      relativePath: entry.name,
    });
  }

  return files.sort((a, b) => a.name.localeCompare(b.name));
}
