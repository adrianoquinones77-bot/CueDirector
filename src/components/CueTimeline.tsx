import { type RefObject, useEffect, useState } from "react";
import type { VideoPlayerHandle } from "./VideoPlayer";
import type { Cue } from "../types/cue";
import { formatTime } from "../utils/formatTime";
import { getCueWindow } from "../utils/getCueWindow";

interface CueTimelineProps {
  cues: Cue[];
  currentTime: number;
  videoPlayerRef: RefObject<VideoPlayerHandle | null>;
}

type MarkerVariant = "past" | "current" | "next" | "future";

function getMarkerVariant(
  cue: Cue,
  current: Cue | undefined,
  next: Cue | undefined,
): MarkerVariant {
  if (current && cue.time === current.time) return "current";
  if (next && cue.time === next.time) return "next";
  if (current && cue.time < current.time) return "past";
  return "future";
}

export default function CueTimeline({
  cues,
  currentTime,
  videoPlayerRef,
}: CueTimelineProps) {
  const [smoothTime, setSmoothTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setSmoothTime(currentTime);
  }, [currentTime]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const player = videoPlayerRef.current;
      if (player) {
        setSmoothTime(player.getCurrentTime());
        const videoDuration = player.getDuration();
        if (videoDuration > 0) {
          setDuration(videoDuration);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoPlayerRef]);

  if (duration <= 0) return null;

  const { current, next } = getCueWindow(cues, currentTime);
  const playheadPosition = (smoothTime / duration) * 100;

  return (
    <div className="cue-timeline">
      <div className="cue-timeline__track">
        <div
          className="cue-timeline__playhead"
          style={{ left: `${playheadPosition}%` }}
        />

        {cues.map((cue, index) => (
          <div
            key={`${cue.time}-${index}`}
            className={`cue-timeline__marker cue-timeline__marker--${getMarkerVariant(cue, current, next)}`}
            style={{ left: `${(cue.time / duration) * 100}%` }}
          >
            <div className="cue-timeline__tooltip">
              <span className="cue-timeline__tooltip-name">{cue.text}</span>
              <span className="cue-timeline__tooltip-time">
                {formatTime(cue.time)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
