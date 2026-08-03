const CUE_ICON_RULES: { keywords: string[]; icon: string }[] = [
  { keywords: ["guitarra"], icon: "🎸" },
  { keywords: ["piano"], icon: "🎹" },
  { keywords: ["batería", "bateria", "bombo"], icon: "🥁" },
  { keywords: ["coros", "voz"], icon: "🎤" },
  { keywords: ["camera", "cam", "take"], icon: "📹" },
  { keywords: ["ready"], icon: "👤" },
  { keywords: ["wide"], icon: "⛶" },
  { keywords: ["blackout"], icon: "⚫" },
  { keywords: ["pyro"], icon: "🔥" },
  { keywords: ["confetti"], icon: "🎉" },
];

const LEADING_EMOJI =
  /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F?\s]+/u;

function getCueIcon(text: string): string | null {
  const lower = text.toLowerCase();

  for (const rule of CUE_ICON_RULES) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return rule.icon;
    }
  }

  return null;
}

export function getCueIconForText(text: string): string | null {
  return getCueIcon(text);
}

export function getCueLabel(text: string): string {
  return text.replace(LEADING_EMOJI, "").trim() || text;
}

export function formatCueText(text: string | undefined): string {
  if (!text) return "--";

  const icon = getCueIcon(text);
  if (!icon) return text;

  const body = text.replace(LEADING_EMOJI, "").trim();
  return body ? `${icon} ${body}` : icon;
}
