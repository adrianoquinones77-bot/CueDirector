import { useSyncExternalStore } from "react";

type Listener = () => void;

/**
 * External playback clock — updated from video timeupdate without React state.
 * Components that need a live playhead call usePlaybackTime(); everything else
 * stays out of the tick path and does not re-render.
 */
let playbackTime = 0;
const listeners = new Set<Listener>();

export function getPlaybackTime(): number {
  return playbackTime;
}

export function setPlaybackTime(next: number): void {
  if (Object.is(playbackTime, next)) return;
  playbackTime = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribePlaybackTime(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Subscribe a component to the playback clock (re-renders only this component). */
export function usePlaybackTime(): number {
  return useSyncExternalStore(
    subscribePlaybackTime,
    getPlaybackTime,
    getPlaybackTime,
  );
}
