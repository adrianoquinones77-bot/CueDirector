/**
 * CueDirector is offline-first by design.
 *
 * Runtime guarantees:
 * - No fetch(), XMLHttpRequest, WebSocket, or external API calls
 * - Videos load from local files via blob URLs (URL.createObjectURL)
 * - Cues load from local CSV / .cues / .show files on disk
 * - Saves write to the local filesystem (File System Access API) or download
 * - UI assets bundle with the app — system fonts only, no CDN links
 *
 * Venue use: build once (`npm run build`), serve the dist folder locally
 * (`npm run serve:offline`), and load your media folder. WiFi is not required.
 */
export const OFFLINE_APP = true as const;
