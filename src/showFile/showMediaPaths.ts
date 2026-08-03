import type { CueDirectorFile } from "../types/cueDirectorFile";

export const SHOW_RESTORE_LOG = "[CueDirector show restore]";

export function dirname(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : filePath;
}

export function getMediaPathCandidates(
  showFile: Pick<CueDirectorFile, "mediaDirectoryPath">,
  showFilePath?: string,
): string[] {
  const candidates: string[] = [];

  if (showFile.mediaDirectoryPath?.trim()) {
    candidates.push(showFile.mediaDirectoryPath.trim());
  }

  if (showFilePath?.trim()) {
    const showDirectory = dirname(showFilePath.trim());
    if (!candidates.includes(showDirectory)) {
      candidates.push(showDirectory);
    }
  }

  return candidates;
}

export function deriveMediaDirectoryFromFiles(
  files: FileList | File[],
): string | undefined {
  const first = Array.from(files)[0];
  if (!first) return undefined;

  const filePath =
    "path" in first && typeof first.path === "string" ? first.path : undefined;
  if (!filePath) return undefined;

  const relativePath =
    "webkitRelativePath" in first &&
    typeof first.webkitRelativePath === "string" &&
    first.webkitRelativePath
      ? first.webkitRelativePath.replace(/\\/g, "/")
      : "";

  if (!relativePath || !relativePath.includes("/")) {
    return dirname(filePath);
  }

  const normalizedPath = filePath.replace(/\\/g, "/");
  if (normalizedPath.endsWith(relativePath)) {
    return normalizedPath
      .slice(0, normalizedPath.length - relativePath.length)
      .replace(/\/$/, "");
  }

  return dirname(filePath);
}

export function logShowRestore(message: string, details?: unknown): void {
  if (details === undefined) {
    console.log(`${SHOW_RESTORE_LOG} ${message}`);
    return;
  }

  console.log(`${SHOW_RESTORE_LOG} ${message}`, details);
}

export const MEDIA_RESTORE_LOG = "[MEDIA RESTORE]";

export function logMediaRestore(details: {
  savedPath?: string;
  resolvedPath?: string;
  exists?: boolean;
  missingFiles?: string[];
  videoFilename?: string;
  hypothesisId?: string;
}): void {
  const parts: string[] = [];
  if (details.savedPath !== undefined) {
    parts.push(`saved path: ${details.savedPath}`);
  }
  if (details.resolvedPath !== undefined) {
    parts.push(`resolved path: ${details.resolvedPath}`);
  }
  if (details.exists !== undefined) {
    parts.push(`exists: ${details.exists}`);
  }
  if (details.videoFilename !== undefined) {
    parts.push(`video: ${details.videoFilename}`);
  }
  if (details.missingFiles !== undefined) {
    parts.push(`missing files: ${details.missingFiles.join(", ") || "(none)"}`);
  }

  console.log(`${MEDIA_RESTORE_LOG} ${parts.join(" | ")}`);

  // #region agent log
  fetch("http://127.0.0.1:7662/ingest/2edb04e6-0a86-4d03-b142-8e0cd3b07871", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "6db2d5",
    },
    body: JSON.stringify({
      sessionId: "6db2d5",
      location: "showMediaPaths.ts:logMediaRestore",
      message: "media restore",
      data: details,
      timestamp: Date.now(),
      hypothesisId: details.hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}
