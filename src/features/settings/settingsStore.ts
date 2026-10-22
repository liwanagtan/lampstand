import { create } from 'zustand';
import { db } from '@/db/db';
import type { SettingKey, SettingRecord, Settings } from '@/db/types';
import { DEFAULT_SETTINGS } from './defaults';

interface SettingsState extends Settings {
  loaded: boolean;
  load: () => Promise<void>;
  set: <K extends SettingKey>(key: K, value: Settings[K]) => Promise<void>;
}

export const useSettings = create<SettingsState>((setState) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const rows = await db.settings.toArray();
    const loaded: Partial<Settings> = {};
    for (const row of rows) {
      if (row.key in DEFAULT_SETTINGS) {
        (loaded as Record<string, unknown>)[row.key] = row.value;
      }
    }
    if (['ASV', 'YLT', 'DBY'].includes(loaded.defaultTranslation ?? '')) {
      loaded.defaultTranslation = 'KJV';
      await db.settings.put({ key: 'defaultTranslation', value: 'KJV' });
    }
    setState({ ...loaded, uiMode: 'light', loaded: true });
  },
  set: async (key, value) => {
    const nextValue = key === 'uiMode' ? 'light' : value;
    setState({ [key]: nextValue } as Partial<SettingsState>);
    await db.settings.put({ key, value: nextValue } as SettingRecord);
  },
}));

/** Read settings outside React (e.g. during import). */
export function getSettings(): Settings {
  const { loaded: _l, load: _ld, set: _s, ...settings } = useSettings.getState();
  return settings;
}
