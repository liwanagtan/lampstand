import type { Features } from '@/app/features';
import type { PlanFile } from '@/schema/plan';
import type { OverlayMode, TemplateId, UiMode } from '@/schema/common';

/** A presentation as stored in the library. `data` is the validated, parsed file. */
export interface PresentationRecord<P = unknown> {
  id: string;
  title: string;
  speaker?: string;
  date?: string;
  data: P;
  createdAt: number;
  updatedAt: number;
  lastPresentedAt?: number;
  /** Play the animated Scene poster (an app setting, not part of the file). Default on. */
  posterAnimated?: boolean;
}

export interface AssetRecord {
  id: string;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  size: number;
  name?: string;
  createdAt: number;
}

export interface BookInfo {
  osis: string;
  name: string;
  /** Number of verses in each chapter, index 0 = chapter 1. */
  verseCounts: number[];
}

export interface TranslationRecord {
  code: string;
  name: string;
  language: string;
  license: string;
  source?: string;
  bundled: boolean;
  /** Content hash of the bundled file, so updated bundles reload. */
  hash?: string;
  books: BookInfo[];
  verseCount: number;
  importedAt: number;
}

export interface VerseRecord {
  code: string;
  /** OSIS verse id, e.g. JHN.3.16 */
  osis: string;
  text: string;
}

export interface Settings {
  defaultTranslation: string;
  defaultTheme: TemplateId;
  defaultOverlayMode: OverlayMode;
  uiMode: UiMode;
  reduceMotion: boolean;
  logoAssetId: string | null;
  bundledBiblesVersion: number;
  shortcutHints: Record<string, number>;
  /** Which destinations show (Me › What I use Lampstand for). */
  features: Features;
  /** The local profile (becomes the account in v2). */
  profile: { name: string };
  /** Feature tips: on/off, when one last showed, and each tip's state. */
  tips: TipsState;
}

export interface TipsState {
  enabled: boolean;
  lastShownAt: number | null;
  /** Per tip: when it was last shown and whether it was dismissed for good. */
  seen: Record<string, { at: number; never?: boolean }>;
}

export type SettingKey = keyof Settings;

export interface SettingRecord<K extends SettingKey = SettingKey> {
  key: K;
  value: Settings[K];
}

export interface HistoryRecord {
  id?: number;
  ref: string;
  translation: string;
  shownAt: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

/** Personal study marks (Bible app). Ids: `h:<verse>` highlight, `b:<range>` bookmark, `n:<uuid>` note. */
export interface MarkRecord {
  id: string;
  kind: 'highlight' | 'bookmark' | 'note';
  /** Canonical verse or range, e.g. JHN.3.16 or JHN.3.16-JHN.3.18. */
  ref: string;
  /** Book code of the first verse, for listing by chapter. */
  book: string;
  /** First chapter of the range. */
  chapter: number;
  color?: HighlightColor;
  text?: string;
  createdAt: number;
  updatedAt: number;
}

/** Progress on a reading plan (Bible app). */
export interface PlanProgressRecord {
  planId: string;
  startedAt: number;
  /** Day numbers (1-based) marked as read. */
  done: number[];
  /** When each day was finished (epoch ms), for the week view. Missing on older records. */
  doneAt?: Record<number, number>;
  updatedAt: number;
}

/** An imported reading plan (Bible app); the file as validated on import. */
export interface PlanDefRecord {
  id: string;
  file: PlanFile;
  importedAt: number;
}

/** A journal entry (Bible app): a reflection on the verse of the day, or a free entry. */
export interface JournalEntryRecord {
  id: string;
  /** Local date the entry belongs to, YYYY-MM-DD. */
  date: string;
  kind: 'reflection' | 'journal';
  /** Canonical verse or range the entry is about, e.g. PSA.46.10. */
  ref?: string;
  title?: string;
  body: string;
  /** Answers to the guided prompts, by prompt id. */
  answers?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Version 2 journal: one entry per day (kept for migration; see JournalEntryRecord). */
export interface JournalRecord {
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** Verse of the day or passage the entry reflects on. */
  ref?: string;
  answers: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}
