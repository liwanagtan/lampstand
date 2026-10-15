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
    setState({ ...loaded, loaded: true });
  },
  set: async (key, value) => {
    setState({ [key]: value } as Partial<SettingsState>);
    await db.settings.put({ key, value } as SettingRecord);
  },
}));

/** Read settings outside React (e.g. during import). */
export function getSettings(): Settings {
  const { loaded: _l, load: _ld, set: _s, ...settings } = useSettings.getState();
  return settings;
}
