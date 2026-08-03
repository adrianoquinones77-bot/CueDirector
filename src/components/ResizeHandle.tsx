import type { PointerEvent as ReactPointerEvent } from "react";

interface ResizeHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  ariaLabel: string;
}

/** Vertical drag handle between resizable layout panels. */
export default function ResizeHandle({
  onPointerDown,
  ariaLabel,
}: ResizeHandleProps) {
  return (
    <div
      className="resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
    />
  );
}
