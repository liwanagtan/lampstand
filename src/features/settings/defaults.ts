import type { Settings } from '@/db/types';
import { ALL_FEATURES } from '@/app/features';

export const DEFAULT_SETTINGS: Settings = {
  defaultTranslation: 'NLT',
  defaultTheme: 'lampstand',
  defaultOverlayMode: 'sidePanel',
  uiMode: 'light',
  reduceMotion: false,
  logoAssetId: null,
  bundledBiblesVersion: 0,
  shortcutHints: {},
  features: ALL_FEATURES,
  profile: { name: '' },
  tips: { enabled: true, lastShownAt: null, seen: {} },
  reminders: { enabled: false, time: '07:00', lastNotified: null },
  classicDevotional: true,
  faithFoundations: true,
  studyNotes: true,
  insights: true,
};
