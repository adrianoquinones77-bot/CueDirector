import { formatTime, formatTimelineClock } from "./formatTime";

export type TimelineRulerTickLevel = "sub" | "second" | "medium" | "large";

export interface TimelineRulerTick {
  time: number;
  level: TimelineRulerTickLevel;
  label?: string;
}

/** Pixels-per-second below this → emphasize every 60s instead of 30s. */
const ZOOMED_OUT_PPS = 6;

/** Label every whole second once each second has enough room. */
const LABEL_EVERY_SECOND_PPS = 28;

/** Introduce 0.5s subdivisions once they are readable. */
const HALF_SECOND_PPS = 40;

/** Introduce 0.1s subdivisions once they are readable. */
const TENTH_SECOND_PPS = 90;

function nearlyMultiple(time: number, interval: number): boolean {
  if (interval <= 0) return false;
  const quotient = time / interval;
  return Math.abs(quotient - Math.round(quotient)) < 1e-6;
}

function formatTickLabel(time: number, showTenths: boolean): string {
  if (showTenths) return formatTime(time);
  return formatTimelineClock(time);
}

/**
 * Build a DAW-style second-based ruler.
 *
 * - Always places a tick at least every 1 second
 * - 5s → medium tick + label
 * - 30s (or 60s when zoomed out) → large tick + label
 * - Zooming in adds 0.5s / 0.1s subdivisions and denser second labels
 */
export function buildTimelineRulerTicks(
  duration: number,
  trackWidthPx: number,
): TimelineRulerTick[] {
  if (!(duration > 0) || !(trackWidthPx > 0)) return [];

  const pixelsPerSecond = trackWidthPx / duration;
  const emphasisInterval = pixelsPerSecond < ZOOMED_OUT_PPS ? 60 : 30;
  const labelEverySecond = pixelsPerSecond >= LABEL_EVERY_SECOND_PPS;

  let step = 1;
  if (pixelsPerSecond >= TENTH_SECOND_PPS) {
    step = 0.1;
  } else if (pixelsPerSecond >= HALF_SECOND_PPS) {
    step = 0.5;
  }

  const showTenths = step < 1;
  const stepCount = Math.floor(duration / step + 1e-9) + 1;
  const ticks: TimelineRulerTick[] = [];

  for (let index = 0; index < stepCount; index += 1) {
    const time = Math.round(index * step * 1000) / 1000;
    if (time > duration + 1e-6) break;

    const clamped = Math.min(time, duration);
    const onSecond = nearlyMultiple(clamped, 1) || clamped === 0;
    const onMedium = nearlyMultiple(clamped, 5);
    const onLarge = nearlyMultiple(clamped, emphasisInterval);

    let level: TimelineRulerTickLevel = "sub";
    let label: string | undefined;

    if (onLarge) {
      level = "large";
      label = formatTickLabel(clamped, showTenths);
    } else if (onMedium) {
      level = "medium";
      label = formatTickLabel(clamped, showTenths);
    } else if (onSecond) {
      level = "second";
      if (labelEverySecond) {
        label = formatTickLabel(clamped, showTenths);
      }
    } else {
      level = "sub";
    }

    ticks.push({ time: clamped, level, label });
  }

  const last = ticks[ticks.length - 1];
  if (!last || Math.abs(last.time - duration) > 1e-3) {
    ticks.push({
      time: duration,
      level: "large",
      label: formatTickLabel(duration, showTenths),
    });
  }

  return ticks;
}
