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
      <h2>NOW</h2>
      <div className="cue current">{current?.text ?? "--"}</div>

      <h2>NEXT</h2>
      <div className="cue next">{next?.text ?? "--"}</div>
      <div className="cue-countdown">
        {next
          ? `in ${Math.max(0, next.time - currentTime).toFixed(1)} s`
          : "No upcoming cue"}
      </div>

      <h2>THEN</h2>
      <div className="cue later">{then?.text ?? "--"}</div>
    </aside>
  );
}
