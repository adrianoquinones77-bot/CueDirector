import { useEffect, useRef } from "react";
import type { Cue } from "../types/cue";
import {
  getCueEndTime,
  getLivePeriodStart,
  isCueActive,
} from "../utils/cueTiming";
import { getCueIconForText, getCueLabel } from "../utils/formatCueText";
import { getCueWindow } from "../utils/getCueWindow";

interface CuePanelProps {
  currentTime: number;
  cues: Cue[];
  defaultCueDuration: number;
  onCueSeek: (time: number) => void;
  directorMode: boolean;
}

type CueRowVariant = "past" | "current" | "future";

const USER_SCROLL_PAUSE_MS = 2000;
const LIVE_LABEL = "LIVE";

function getNextCueProgress(
  cues: Cue[],
  current: Cue | undefined,
  next: Cue | undefined,
  currentTime: number,
  defaultCueDuration: number,
): number {
  if (!next) return 0;

  const windowStart = current
    ? current.time
    : getLivePeriodStart(cues, currentTime, defaultCueDuration);
  const total = next.time - windowStart;
  if (total <= 0) return 0;

  const remaining = Math.max(0, next.time - currentTime);
  return (remaining / total) * 100;
}

function getCueRowVariant(
  cue: Cue,
  currentTime: number,
  defaultCueDuration: number,
): CueRowVariant {
  if (isCueActive(cue, currentTime, defaultCueDuration)) return "current";
  if (currentTime >= getCueEndTime(cue, defaultCueDuration)) return "past";
  return "future";
}

function formatCueSheetTime(time: number): string {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = Math.floor(time % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRowIcon(variant: CueRowVariant): string {
  if (variant === "past") return "✓";
  if (variant === "current") return "▶";
  return "";
}

function DirectorCueDisplay({
  text,
  className,
}: {
  text?: string;
  className: string;
}) {
  if (!text) {
    return (
      <div className={`cue-display ${className}`}>
        <div className="cue-display__text">--</div>
      </div>
    );
  }

  const icon = getCueIconForText(text);
  const label = getCueLabel(text);

  return (
    <div className={`cue-display ${className}`}>
      {icon && (
        <span className="cue-display__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="cue-display__text">{label}</div>
    </div>
  );
}

function getNowDisplayText(
  current: Cue | undefined,
  cues: Cue[],
): string | undefined {
  if (current) return current.text;
  if (cues.length === 0) return undefined;
  return LIVE_LABEL;
}

export default function CuePanel({
  currentTime,
  cues,
  defaultCueDuration,
  onCueSeek,
  directorMode,
}: CuePanelProps) {
  const { current, next } = getCueWindow(cues, currentTime, defaultCueDuration);
  const nowText = getNowDisplayText(current, cues);
  const nextCueProgress = getNextCueProgress(
    cues,
    current,
    next,
    currentTime,
    defaultCueDuration,
  );
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
    <aside className="cue-rail">
      <div className="cue-director">
        <section className="cue-section cue-section--now">
          <h2 className="cue-section__title">NOW</h2>
          <DirectorCueDisplay
            text={nowText}
            className={`cue current${!current ? " cue--live" : ""}`}
          />
        </section>

        <div className="cue-divider" role="separator" />

        <section className="cue-section cue-section--next">
          <h2 className="cue-section__title">NEXT</h2>
          <DirectorCueDisplay text={next?.text} className="cue next" />
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
      </div>

      <section className="cue-sheet-panel">
        <h2 className="cue-section__title">CUE SHEET</h2>
        <ul ref={listRef} className="cue-sheet-list">
          {cues.map((cue, index) => {
            const variant = getCueRowVariant(
              cue,
              currentTime,
              defaultCueDuration,
            );
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
                  <span className="cue-sheet-item__icon" aria-hidden="true">
                    {getRowIcon(variant)}
                  </span>
                  <span className="cue-sheet-item__time">
                    {formatCueSheetTime(cue.time)}
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
