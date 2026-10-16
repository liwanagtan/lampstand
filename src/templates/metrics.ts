// Slide canvas tokens (PRD §8 Slide templates). Sizes are for a 1920×1080 canvas that scales
// to any 16:9 output.

export const CANVAS = { width: 1920, height: 1080 } as const;

/** 5% safe area on every edge: 96 px left/right, 54 px top/bottom. */
export const SAFE = { x: 96, y: 54 } as const;

export const TYPE = {
  display: 112,
  heading: 88,
  subheading: 64,
  body: 48,
  verse: 52,
  caption: 32,
  countdown: 240,
  /** Nothing on the TV is smaller than this. */
  minimum: 32,
  /** Body and verse text never go below this. */
  minimumBody: 40,
} as const;

export const LINE_HEIGHT = { display: 1.05, heading: 1.12, body: 1.35, verse: 1.35 } as const;

/** Verse overlay geometry (PRD §8 Verse overlays). */
export const OVERLAY = {
  lowerThirdHeight: 0.34,
  lowerThirdBlur: 24,
  sidePanelWidth: 0.42,
  panelPaddingX: 72,
  panelPaddingY: 44,
  /** Frosted-glass blur for the lower third and the popup card. */
  glassBlur: 32,
  popupWidth: 0.6,
  popupMaxHeight: 0.72,
  popupPaddingX: 88,
  popupPaddingY: 72,
} as const;

/** Inner content widths that keep lines readable (≈ 12 words for headings). */
export const MEASURE = { heading: 1500, body: 1400, verse: 1560, quote: 1400 } as const;

export function canvasVars(): Record<string, string> {
  return {
    '--s-display': `${TYPE.display}px`,
    '--s-heading': `${TYPE.heading}px`,
    '--s-subheading': `${TYPE.subheading}px`,
    '--s-body': `${TYPE.body}px`,
    '--s-verse': `${TYPE.verse}px`,
    '--s-caption': `${TYPE.caption}px`,
    '--s-countdown': `${TYPE.countdown}px`,
    '--s-safe-x': `${SAFE.x}px`,
    '--s-safe-y': `${SAFE.y}px`,
    '--s-lh-display': String(LINE_HEIGHT.display),
    '--s-lh-heading': String(LINE_HEIGHT.heading),
    '--s-lh-body': String(LINE_HEIGHT.body),
    '--s-measure-heading': `${MEASURE.heading}px`,
    '--s-measure-body': `${MEASURE.body}px`,
    '--s-measure-verse': `${MEASURE.verse}px`,
    '--s-measure-quote': `${MEASURE.quote}px`,
    '--s-lower-third': `${OVERLAY.lowerThirdHeight * CANVAS.height}px`,
    '--s-side-panel': `${OVERLAY.sidePanelWidth * CANVAS.width}px`,
    '--s-panel-px': `${OVERLAY.panelPaddingX}px`,
    '--s-panel-py': `${OVERLAY.panelPaddingY}px`,
    '--s-overlay-blur': `${OVERLAY.lowerThirdBlur}px`,
    '--s-glass-blur': `${OVERLAY.glassBlur}px`,
    '--s-popup-width': `${OVERLAY.popupWidth * CANVAS.width}px`,
    '--s-popup-max-height': `${OVERLAY.popupMaxHeight * CANVAS.height}px`,
    '--s-popup-px': `${OVERLAY.popupPaddingX}px`,
    '--s-popup-py': `${OVERLAY.popupPaddingY}px`,
  };
}
