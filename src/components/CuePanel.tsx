import type { Cue } from "../types/cue";
import { getCueWindow } from "../utils/getCueWindow";

interface CuePanelProps {
  currentTime: number;
  cues: Cue[];
}

export default function CuePanel({ currentTime, cues }: CuePanelProps) {
  const { current, next, then } = getCueWindow(cues, currentTime);

  return (
    <aside className="cue-panel">
      <section className="cue-section cue-section--now">
        <h2 className="cue-section__title">NOW</h2>
        <div className="cue current">{current?.text ?? "--"}</div>
      </section>

      <div className="cue-divider" role="separator" />

      <section className="cue-section cue-section--next">
        <h2 className="cue-section__title">NEXT</h2>
        <div className="cue next">{next?.text ?? "--"}</div>
        <div
          className={`cue-countdown${next ? " cue-countdown--active" : ""}`}
        >
          {next
            ? `in ${Math.max(0, next.time - currentTime).toFixed(1)} s`
            : "No upcoming cue"}
        </div>
      </section>

      <div className="cue-divider" role="separator" />

      <section className="cue-section cue-section--then">
        <h2 className="cue-section__title">THEN</h2>
        <div className="cue later">{then?.text ?? "--"}</div>
      </section>
    </aside>
  );
}
