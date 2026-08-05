import { memo } from "react";
import { createPortal } from "react-dom";

interface LiveLockShieldProps {
  onRequestUnlock: () => void;
}

/**
 * Invisible full-screen layer for live locked mode.
 * No blur, no chrome — click anywhere to open the Unlock dialog.
 */
function LiveLockShield({ onRequestUnlock }: LiveLockShieldProps) {
  const shield = (
    <div
      className="live-lock-shield"
      role="presentation"
      aria-label="Application locked — click to unlock"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRequestUnlock();
      }}
    />
  );

  if (typeof document === "undefined") {
    return shield;
  }

  return createPortal(shield, document.body);
}

export default memo(LiveLockShield);
