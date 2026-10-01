import { useEffect, useState } from "react";
import { formatSyncOffset } from "../utils/videoSeek";

interface SyncOffsetOverlayProps {
  /** Cumulative offset for the active song (seconds). */
  offsetSec: number;
  /** Bumps whenever an adjustment is made so the overlay re-shows. */
  flashToken: number;
  durationMs?: number;
}

/**
 * Temporary bottom-right live sync readout. Does not persist; cues are unchanged.
 */
export default function SyncOffsetOverlay({
  offsetSec,
  flashToken,
  durationMs = 1000,
}: SyncOffsetOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (flashToken <= 0) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [flashToken, durationMs]);

  if (!visible || flashToken <= 0) return null;

  return (
    <div
      className="sync-offset-overlay"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sync-offset-overlay__label">SYNC OFFSET</span>
      <span className="sync-offset-overlay__value">
        {formatSyncOffset(offsetSec)}
      </span>
    </div>
  );
}
