/**
 * Default cue names applied when an emoji is picked in Create Cue.
 * Selecting an emoji only fills the name — it never creates the cue.
 */
export const CUE_EMOJI_DEFAULT_NAMES: Readonly<Record<string, string>> = {
  "🎸": "Guitar",
  "🎤": "Vocal",
  "🥁": "Drums",
  "🎹": "Keys",
  "🎺": "Brass",
  "🎻": "Strings",
  "🎷": "Saxophone",
  "💃": "Dancers",
  "👏": "Audience",
  "🎬": "Scene Change",
  "🎥": "Video",
  "💡": "Lighting",
  "🎧": "Playback",
  "📻": "Radio",
  "🎆": "Pyro",
  "🔥": "Pyro",
  "⚫": "Blackout",
  "📝": "General",
  "🎵": "Music",
};

export function getDefaultCueNameForEmoji(emoji: string): string | undefined {
  const trimmed = emoji.trim();
  if (!trimmed) return undefined;
  return CUE_EMOJI_DEFAULT_NAMES[trimmed];
}
