// Live state (PRD §4 Live state), owned by the control window and mirrored to the output.
import type { OverlayMode, TemplateId } from '@/schema/common';
import type { Background, StoredPresentation } from '@/schema/presentation';

export interface LiveOverlay {
  /** Canonical range, e.g. "JHN.3.16-JHN.3.18". */
  ref: string;
  translation: string;
  mode: OverlayMode;
  page: number;
  emphasis?: string[];
  /** "card": drawn like Today's verse-of-the-day card (full screen only). */
  look?: 'card';
}

/** Word study on the TV: one word of the verse on screen, with its Hebrew or Greek. */
export interface LiveWord {
  /** Strong's number as stored in public/words (src/features/bible-app/wordStudyCodes.ts). */
  strong: number;
  /** The verse it is in, e.g. "PSA.119.105". */
  verse: string;
  /** The word as the BSB has it ("lamp"), picked out in the verse. */
  text: string;
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
  /** Bible session only: the picture behind the verses (template backdrop when unset). */
  backdrop?: Background | null;
  /** A word of the verse on screen, studied on the TV (Bible session). */
  word?: LiveWord | null;
  /** Mark every studyable word of the verse on screen (while the Words column is open). */
  studyWords?: boolean;
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
  /** Whether the poster (title slide, Sermon screen) plays its animated Scene. */
  posterAnimated: boolean;
  /** Monotonic time of the last change, so reopened outputs skip entrance motion. */
  changedAt: number;
}

/** `presentationId` while the Bible tab drives the TV (no presentation, verses only). */
export const BIBLE_ID = 'bible';

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
