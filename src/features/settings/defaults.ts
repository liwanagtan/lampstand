import type { Settings } from '@/db/types';

export const DEFAULT_SETTINGS: Settings = {
  defaultTranslation: 'KJV',
  defaultTheme: 'classic',
  defaultOverlayMode: 'lowerThird',
  uiMode: 'system',
  reduceMotion: false,
  logoAssetId: null,
  bundledBiblesVersion: 0,
  shortcutHints: {},
};
