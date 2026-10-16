export const TEMPLATE_IDS = ['classic', 'modern', 'warm'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const OVERLAY_MODES = ['lowerThird', 'sidePanel', 'fullScreen', 'popup'] as const;
export type OverlayMode = (typeof OVERLAY_MODES)[number];

export const UI_MODES = ['light', 'dark', 'system'] as const;
export type UiMode = (typeof UI_MODES)[number];

export const TRANSITIONS = ['fade', 'rise', 'push', 'none'] as const;
export type Transition = (typeof TRANSITIONS)[number];
