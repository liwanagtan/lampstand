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
