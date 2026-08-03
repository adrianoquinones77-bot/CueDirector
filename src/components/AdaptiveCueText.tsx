import { useLayoutEffect, useRef } from "react";

interface AdaptiveCueTextProps {
  text: string;
  className?: string;
}

function readAdaptiveVars(element: HTMLElement | null) {
  if (!element) {
    return { maxSize: 40, minSize: 14, maxLines: 2 };
  }

  const styles = getComputedStyle(element);
  const maxSize = Number.parseFloat(styles.getPropertyValue("--cue-adaptive-max")) || 40;
  const minSize = Number.parseFloat(styles.getPropertyValue("--cue-adaptive-min")) || 14;
  const maxLines = Number.parseInt(styles.getPropertyValue("--cue-adaptive-lines"), 10) || 2;

  return { maxSize, minSize, maxLines };
}

export default function AdaptiveCueText({
  text,
  className = "cue-display__text",
}: AdaptiveCueTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const card = container.closest(".cue-broadcast-card") as HTMLElement | null;

    const fitText = () => {
      const { maxSize, minSize, maxLines } = readAdaptiveVars(card);

      textEl.style.display = "block";
      textEl.style.setProperty("-webkit-line-clamp", "unset");
      textEl.style.setProperty("line-clamp", "unset");
      textEl.style.overflow = "hidden";

      let low = minSize;
      let high = maxSize;
      let best = minSize;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        textEl.style.fontSize = `${mid}px`;

        const lineHeight =
          Number.parseFloat(getComputedStyle(textEl).lineHeight) || mid * 1.1;
        const maxHeight = lineHeight * maxLines;
        const fits = textEl.scrollHeight <= maxHeight + 1;

        if (fits) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      textEl.style.fontSize = `${best}px`;
      textEl.style.removeProperty("display");
      textEl.style.removeProperty("-webkit-line-clamp");
      textEl.style.removeProperty("line-clamp");
      textEl.style.removeProperty("overflow");
    };

    fitText();

    const observer = new ResizeObserver(() => fitText());
    observer.observe(container);
    if (card) {
      observer.observe(card);
    }

    return () => observer.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className="cue-display__text-container">
      <p ref={textRef} className={className}>
        {text}
      </p>
    </div>
  );
}
