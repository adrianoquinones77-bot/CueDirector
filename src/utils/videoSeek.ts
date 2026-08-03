export function getVideoSeekDelta(
  code: string,
  shiftKey: boolean,
): number | null {
  switch (code) {
    case "ArrowRight":
      return shiftKey ? 0.1 : 1;
    case "ArrowLeft":
      return shiftKey ? -0.1 : -1;
    default:
      return null;
  }
}
