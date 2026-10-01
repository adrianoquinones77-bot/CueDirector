/** Fine live-sync nudge (no modifier). */
export const SYNC_OFFSET_FINE_SEC = 0.2;
/** Coarse live-sync nudge (Shift held). */
export const SYNC_OFFSET_COARSE_SEC = 1;

export function getVideoSeekDelta(
  code: string,
  shiftKey: boolean,
): number | null {
  const amount = shiftKey ? SYNC_OFFSET_COARSE_SEC : SYNC_OFFSET_FINE_SEC;

  switch (code) {
    case "ArrowRight":
      return amount;
    case "ArrowLeft":
      return -amount;
    default:
      return null;
  }
}

/** Keep displayed cumulative offset on hundredths of a second. */
export function accumulateSyncOffset(
  current: number,
  delta: number,
): number {
  return Math.round((current + delta) * 100) / 100;
}

export function formatSyncOffset(seconds: number): string {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "" : "+";
  return `${sign}${seconds.toFixed(2)} s`;
}
