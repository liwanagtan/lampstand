/** Every theme a file may name. Older files say classic, modern or warm. */
export const TEMPLATE_IDS = ['lampstand', 'classic', 'modern', 'warm'] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
/**
 * Themes offered and drawn. Classic, Modern and Warm are set aside for now: every presentation
 * shows in the Lampstand theme, whatever its file says (src/templates/templates.ts).
 */
export const ACTIVE_TEMPLATE_IDS = ['lampstand'] as const satisfies readonly TemplateId[];

export const OVERLAY_MODES = ['lowerThird', 'sidePanel', 'fullScreen', 'popup'] as const;
export type OverlayMode = (typeof OVERLAY_MODES)[number];

export const UI_MODES = ['light', 'dark', 'system'] as const;
export type UiMode = (typeof UI_MODES)[number];

export const TRANSITIONS = ['fade', 'rise', 'push', 'none'] as const;
export type Transition = (typeof TRANSITIONS)[number];
