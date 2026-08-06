import { memo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface LiveLockShieldProps {
  onRequestUnlock: () => void;
}

/** Ignore unlock gestures that arrive from the START SHOW click-through. */
const UNLOCK_ARM_MS = 500;

/**
 * Invisible full-screen layer for live locked mode.
 * No blur, no chrome — click anywhere to open the Unlock dialog.
 * Does not arm until after mount so START SHOW cannot re-open PIN.
 */
function LiveLockShield({ onRequestUnlock }: LiveLockShieldProps) {
  const armedRef = useRef(false);

  useEffect(() => {
    armedRef.current = false;
    const timer = window.setTimeout(() => {
      armedRef.current = true;
    }, UNLOCK_ARM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const requestUnlock = () => {
    if (!armedRef.current) return;
    onRequestUnlock();
  };

  const shield = (
    <div
      className="live-lock-shield"
      role="presentation"
      aria-label="Application locked — click to unlock"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestUnlock();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestUnlock();
      }}
    />
  );

  if (typeof document === "undefined") {
    return shield;
  }

  return createPortal(shield, document.body);
}

export default memo(LiveLockShield);
