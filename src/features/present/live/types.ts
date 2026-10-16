// Live state (PRD §4 Live state), owned by the control window and mirrored to the output.
import type { OverlayMode, TemplateId } from '@/schema/common';
import type { StoredPresentation } from '@/schema/presentation';

export interface LiveOverlay {
  /** Canonical range, e.g. "JHN.3.16-JHN.3.18". */
  ref: string;
  translation: string;
  mode: OverlayMode;
  page: number;
  emphasis?: string[];
}

/** What covers the slide on the TV: nothing, black, the logo, or the sermon poster. */
export type Screen = 'content' | 'blank' | 'logo' | 'sermon';

export interface LiveState {
  presentationId: string | null;
  slideIndex: number;
  /** Revealed bullet count on build slides. */
  buildStep: number;
  /** Page of a long passage on a verse slide. */
  slidePage: number;
  overlay: LiveOverlay | null;
  screen: Screen;
  theme: TemplateId;
  /** When the live countdown slide reaches zero (epoch ms). */
  countdownEndsAt: number | null;
}

/** Everything the output needs to draw the TV without asking anyone. */
export interface LiveSnapshot {
  rev: number;
  live: LiveState;
  presentation: StoredPresentation | null;
  /** The presentation's translation after defaults. */
  translation: string;
  logoAssetId: string | null;
  /** The operator's Reduce motion setting, so the TV follows it without a reload. */
  reduceMotion: boolean;
  /** Monotonic time of the last change, so reopened outputs skip entrance motion. */
  changedAt: number;
}

export const INITIAL_LIVE: LiveState = {
  presentationId: null,
  slideIndex: 0,
  buildStep: 0,
  slidePage: 0,
  overlay: null,
  screen: 'content',
  theme: 'classic',
  countdownEndsAt: null,
};
