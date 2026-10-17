import type { Settings } from '@/db/types';
import { ALL_FEATURES } from '@/app/features';

export const DEFAULT_SETTINGS: Settings = {
  defaultTranslation: 'KJV',
  defaultTheme: 'classic',
  defaultOverlayMode: 'lowerThird',
  uiMode: 'system',
  reduceMotion: false,
  logoAssetId: null,
  bundledBiblesVersion: 0,
  shortcutHints: {},
  features: ALL_FEATURES,
  profile: { name: '' },
  tips: { enabled: true, lastShownAt: null, seen: {} },
};
