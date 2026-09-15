/**
 * The app's design tokens, copied from src/app/globals.css. The video is a
 * separate bundle, so the values live here rather than importing the app's CSS —
 * if a token moves in the app, it has to be moved here too.
 */
export const C = {
  paper: "#f7f9fc",
  sheet: "#ffffff",
  dropout: "#d8ecf7",
  dropoutMid: "#9ecfe6",
  dropoutDeep: "#4f97bd",
  ink: "#12233a",
  graphite: "#5c6a7c",
  graphiteLt: "#8a97a8",
  redpen: "#cf2e3f",
  ok: "#1a7f5a",
} as const;

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** Every screenshot under docs/screenshots was taken at 1280 CSS px, 2x. */
export const SHOT_W = 2560;
