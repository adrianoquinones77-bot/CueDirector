# CueDirector

Offline live show cue director. Load local MP4 videos, CSV / `.cues` cue sheets, and `.show` project files — no internet, no cloud, no external APIs.

## Offline-first

CueDirector is built for live venues with no WiFi:

| Data | Source |
|------|--------|
| App (HTML/JS/CSS) | Bundled locally — `npm run build` |
| Videos | Local MP4 files from your media folder |
| Cues | Local CSV, `.cues`, or embedded in `.show` |
| Saves | Local filesystem or browser download |

At runtime the app makes **zero network requests**. Videos play from in-memory blob URLs; cues are read and written to disk on your machine.

## Venue setup

1. **Build once** (on any machine with Node.js):

   ```bash
   npm install
   npm run build
   ```

2. **At the venue** (no internet needed), serve the built app locally:

   ```bash
   npm run serve:offline
   ```

   Open `http://127.0.0.1:4173` in Chrome or Edge.

3. **Load your show** — use **Load Show Directory** (footer) or **File → Open Show** to pick your local folder containing MP4s and cue files.

Copy the entire project folder (including `dist/` and your media folder) to a USB drive or venue laptop if you prefer not to build on-site.

## Development

```bash
npm install
npm run dev
```

## Supported file types

- **`.mp4`** — video playback
- **`.csv`** — cue sheet (time, text columns)
- **`.cues`** — JSON cue sidecar (overrides CSV when both exist)
- **`.show`** — project file (video references, playlist order, cues, timeline & editor settings)
- **`.cuedirector`** — legacy project file (still supported when opening)

## Browser support

Chrome and Edge are recommended for the File System Access API (folder picker, in-place `.cues` saves). Safari and Firefox fall back to file upload and download for saves.

## Requirements

- Node.js 18+ (build and local serve only — not required during the show if `dist/` is pre-built)
- A modern Chromium-based browser for full folder access
