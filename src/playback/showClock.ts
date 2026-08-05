import { useSyncExternalStore } from "react";

type Listener = () => void;

/**
 * Wall-clock show timer — independent of video playhead.
 * Starts only via START SHOW; continues across songs until End Show / Reset.
 */
let live = false;
let running = false;
/** True after START SHOW until reset (timer may be frozen after End Show). */
let sessionActive = false;
let baseElapsedMs = 0;
let startedAtMs: number | null = null;
const listeners = new Set<Listener>();
let rafId: number | null = null;

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function stopTicker(): void {
  if (rafId == null) return;
  cancelAnimationFrame(rafId);
  rafId = null;
}

function tick(): void {
  emit();
  if (running) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
}

function startTicker(): void {
  if (rafId != null) return;
  rafId = requestAnimationFrame(tick);
}

export function getShowElapsedMs(): number {
  if (running && startedAtMs != null) {
    return baseElapsedMs + (Date.now() - startedAtMs);
  }
  return baseElapsedMs;
}

export function getShowLive(): boolean {
  return live;
}

export function getShowSessionActive(): boolean {
  return sessionActive;
}

/** Whole seconds for HH:MM:SS display (stable snapshot for React). */
export function getShowElapsedSeconds(): number {
  return Math.floor(getShowElapsedMs() / 1000);
}

export function formatShowClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Begin a live show session at 00:00:00. */
export function startShowClock(): void {
  live = true;
  running = true;
  sessionActive = true;
  baseElapsedMs = 0;
  startedAtMs = Date.now();
  emit();
  startTicker();
}

/** Stop the timer and clear LIVE; keep elapsed until reset. */
export function endShowClock(): void {
  if (running && startedAtMs != null) {
    baseElapsedMs += Date.now() - startedAtMs;
  }
  running = false;
  startedAtMs = null;
  live = false;
  stopTicker();
  emit();
}

/** Full reset — new show loaded or explicit Reset Show Timer. */
export function resetShowClock(): void {
  live = false;
  running = false;
  sessionActive = false;
  baseElapsedMs = 0;
  startedAtMs = null;
  stopTicker();
  emit();
}

export function subscribeShowClock(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useShowLive(): boolean {
  return useSyncExternalStore(subscribeShowClock, getShowLive, getShowLive);
}

export function useShowSessionActive(): boolean {
  return useSyncExternalStore(
    subscribeShowClock,
    getShowSessionActive,
    getShowSessionActive,
  );
}

export function useShowElapsedSeconds(): number {
  return useSyncExternalStore(
    subscribeShowClock,
    getShowElapsedSeconds,
    getShowElapsedSeconds,
  );
}
