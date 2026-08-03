export function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) return "00:00.0";

  const totalTenths = Math.floor(time * 10 + 1e-9);
  const minutes = Math.floor(totalTenths / 600);
  const remainderTenths = totalTenths % 600;
  const seconds = Math.floor(remainderTenths / 10);
  const tenths = remainderTenths % 10;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

/** Parse MM:SS.t (and plain seconds) from cue editor time fields. */
export function parseCueEditorTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const formatted = trimmed.match(/^(\d+):(\d{2})\.(\d)$/);
  if (formatted) {
    const minutes = Number(formatted[1]);
    const seconds = Number(formatted[2]);
    const tenths = Number(formatted[3]);
    if (
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      !Number.isFinite(tenths) ||
      seconds >= 60 ||
      tenths >= 10
    ) {
      return null;
    }
    return minutes * 60 + seconds + tenths / 10;
  }

  const clock = trimmed.match(/^(\d+):(\d{2})$/);
  if (clock) {
    const minutes = Number(clock[1]);
    const seconds = Number(clock[2]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return null;
}

/** Whole-minute clock for timeline labels (e.g. 03:45). */
export function formatTimelineClock(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const DEFAULT_VIDEO_FRAME_RATE = 30;

/** Clamp and snap a cue timestamp to video frames, then millisecond precision. */
export function snapCueTime(
  time: number,
  duration: number,
  frameRate = DEFAULT_VIDEO_FRAME_RATE,
): number {
  const clamped = Math.max(0, Math.min(duration, time));
  const frameSnapped = Math.round(clamped * frameRate) / frameRate;
  return Math.round(frameSnapped * 1000) / 1000;
}
