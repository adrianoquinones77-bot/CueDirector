/** Default panel widths — cue sheet gets the majority of the cue rail. */
export const DEFAULT_PANEL_LAYOUT = {
  playlistWidth: 270,
  cueRailWidth: 1180,
  directorWidth: 400,
} as const;

export const PANEL_LAYOUT_STORAGE_KEY = "cuedirector-panel-layout";

/** @deprecated Migrated into PANEL_LAYOUT_STORAGE_KEY */
export const EDITOR_LAYOUT_STORAGE_KEY = "cuedirector-editor-panel-layout";

/** @deprecated Migrated into PANEL_LAYOUT_STORAGE_KEY */
export const CUE_RAIL_SPLIT_STORAGE_KEY = "cuedirector-cue-rail-split";

export const PANEL_LIMITS = {
  playlist: { min: 180, max: 320, default: DEFAULT_PANEL_LAYOUT.playlistWidth },
  cueSheet: { min: 420, max: 960 },
  director: { min: 300, default: DEFAULT_PANEL_LAYOUT.directorWidth },
  mainMin: 240,
  cueRail: { default: DEFAULT_PANEL_LAYOUT.cueRailWidth },
} as const;

/** @deprecated Use DEFAULT_PANEL_LAYOUT */
export const LIVE_PANEL_LAYOUT = {
  playlistWidth: DEFAULT_PANEL_LAYOUT.playlistWidth,
  cueRailWidth: DEFAULT_PANEL_LAYOUT.cueRailWidth,
  directorWidth: DEFAULT_PANEL_LAYOUT.directorWidth,
  cueSheetWidth:
    DEFAULT_PANEL_LAYOUT.cueRailWidth - DEFAULT_PANEL_LAYOUT.directorWidth,
} as const;

/** @deprecated Use PANEL_LIMITS */
export const CUE_RAIL_SPLIT_LIMITS = {
  directorMin: PANEL_LIMITS.director.min,
  cueSheetMin: PANEL_LIMITS.cueSheet.min,
  defaultDirectorWidth: PANEL_LIMITS.director.default,
} as const;
