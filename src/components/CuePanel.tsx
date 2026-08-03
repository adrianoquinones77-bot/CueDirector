import { useEffect, useRef } from "react";
import type { Cue } from "../types/cue";
import { formatCueText, getCueLabel } from "../utils/formatCueText";
import { getCueWindow } from "../utils/getCueWindow";

interface CuePanelProps {
  currentTime: number;
  cues: Cue[];
  onCueSeek: (time: number) => void;
  directorMode: boolean;
}

type CueRowVariant = "past" | "current" | "future";

const USER_SCROLL_PAUSE_MS = 2000;

function getNextCueProgress(
  current: Cue | undefined,
  next: Cue | undefined,
  currentTime: number,
): number {
  if (!next) return 0;

  const windowStart = current?.time ?? 0;
  const total = next.time - windowStart;
  if (total <= 0) return 0;

  const remaining = Math.max(0, next.time - currentTime);
  return (remaining / total) * 100;
}

function getCueRowVariant(
  cue: Cue,
  current: Cue | undefined,
  currentTime: number,
): CueRowVariant {
  if (current && cue.time === current.time) return "current";
  if (cue.time <= currentTime) return "past";
  return "future";
}

function formatCueTimestamp(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CuePanel({
  currentTime,
  cues,
  onCueSeek,
  directorMode,
}: CuePanelProps) {
  const { current, next } = getCueWindow(cues, currentTime);
  const nextCueProgress = getNextCueProgress(current, next, currentTime);
  const currentRowRef = useRef<HTMLLIElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const userScrollingRef = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let resumeTimeout = 0;

    const handleScroll = () => {
      userScrollingRef.current = true;
      window.clearTimeout(resumeTimeout);
      resumeTimeout = window.setTimeout(() => {
        userScrollingRef.current = false;
      }, USER_SCROLL_PAUSE_MS);
    };

    list.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      list.removeEventListener("scroll", handleScroll);
      window.clearTimeout(resumeTimeout);
    };
  }, []);

  useEffect(() => {
    if (userScrollingRef.current) return;

    currentRowRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [current?.time]);

  return (
    <aside className="cue-panel">
      <section className="cue-section cue-section--now">
        <h2 className="cue-section__title">NOW</h2>
        <div className="cue current">{formatCueText(current?.text)}</div>
      </section>

      <div className="cue-divider" role="separator" />

      <section className="cue-section cue-section--next">
        <h2 className="cue-section__title">NEXT</h2>
        <div className="cue next">{formatCueText(next?.text)}</div>
        <div
          className={`cue-countdown${next ? " cue-countdown--active" : ""}`}
        >
          {next
            ? `in ${Math.max(0, next.time - currentTime).toFixed(1)} s`
            : "No upcoming cue"}
        </div>
        {next && (
          <div className="cue-countdown-progress" aria-hidden="true">
            <div
              className="cue-countdown-progress__fill"
              style={{ width: `${nextCueProgress}%` }}
            />
          </div>
        )}
      </section>

      <div className="cue-divider" role="separator" />

      <section className="cue-section cue-section--sheet">
        <h2 className="cue-section__title">CUE SHEET</h2>
        <ul ref={listRef} className="cue-sheet-list">
          {cues.map((cue, index) => {
            const variant = getCueRowVariant(cue, current, currentTime);
            const isCurrent = variant === "current";

            return (
              <li
                key={`${cue.time}-${index}`}
                ref={isCurrent ? currentRowRef : undefined}
                className={`cue-sheet-item cue-sheet-item--${variant}`}
              >
                <button
                  type="button"
                  className="cue-sheet-item__button"
                  disabled={directorMode}
                  onClick={() => onCueSeek(cue.time)}
                >
                  <span className="cue-sheet-item__time">
                    {formatCueTimestamp(cue.time)}
                  </span>
                  <span className="cue-sheet-item__name">
                    {getCueLabel(cue.text)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
