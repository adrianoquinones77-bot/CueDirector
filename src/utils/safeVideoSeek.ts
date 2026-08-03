export const SEEK_COOLDOWN_MS = 150;

export function isVideoSeekReady(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_METADATA &&
    Number.isFinite(video.duration)
  );
}

export function clampVideoTime(video: HTMLVideoElement, time: number): number {
  if (!Number.isFinite(time)) return 0;

  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, time);
  }

  return Math.max(0, Math.min(duration, time));
}

export function applyVideoSeek(
  video: HTMLVideoElement,
  time: number,
): number | null {
  if (!isVideoSeekReady(video)) return null;

  const clamped = clampVideoTime(video, time);

  try {
    video.currentTime = clamped;
    return clamped;
  } catch {
    return null;
  }
}
