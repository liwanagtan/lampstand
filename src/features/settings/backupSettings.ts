import { ALL_FEATURES } from '@/app/features';
import { FAITH_JOURNEYS } from '@/app/faithJourney';
import type { SettingRecord } from '@/db/types';
import { TEMPLATE_IDS, OVERLAY_MODES } from '@/schema/common';
import { DEFAULT_SETTINGS } from './defaults';

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const time = (value: unknown): boolean =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** Backups are user-provided files: accept only known settings with the shape the app reads. */
export function safeBackupSetting(value: unknown): SettingRecord | null {
  if (!object(value) || typeof value.key !== 'string' || !(value.key in DEFAULT_SETTINGS))
    return null;
  const key = value.key as keyof typeof DEFAULT_SETTINGS;
  const v = value.value;
  let safe = false;
  switch (key) {
    case 'defaultTranslation':
      safe = typeof v === 'string' && /^[A-Z0-9-]{2,16}$/.test(v);
      break;
    case 'defaultTheme':
      safe = typeof v === 'string' && TEMPLATE_IDS.some((id) => id === v);
      break;
    case 'defaultOverlayMode':
      safe = typeof v === 'string' && OVERLAY_MODES.some((mode) => mode === v);
      break;
    case 'uiMode':
      safe = v === 'light';
      break;
    case 'reduceMotion':
    case 'classicDevotional':
    case 'studyNotes':
    case 'insights':
      safe = typeof v === 'boolean';
      break;
    case 'logoAssetId':
      safe = v === null || (typeof v === 'string' && v.length <= 200);
      break;
    case 'bundledBiblesVersion':
      return null; // Cache metadata belongs to this device, never to a backup.
    case 'shortcutHints':
      safe =
        object(v) &&
        Object.keys(v).length <= 100 &&
        Object.entries(v).every(
          ([name, n]) =>
            name.length <= 100 && typeof n === 'number' && Number.isFinite(n) && n >= 0,
        );
      break;
    case 'features':
      safe = object(v) && Object.keys(ALL_FEATURES).every((part) => typeof v[part] === 'boolean');
      break;
    case 'profile':
      safe =
        object(v) &&
        typeof v.name === 'string' &&
        v.name.length <= 200 &&
        (v.color === undefined ||
          ['amber', 'sage', 'sky', 'rose', 'violet', 'slate'].includes(String(v.color))) &&
        (v.faithJourney === undefined ||
          (Array.isArray(v.faithJourney)
            ? v.faithJourney.length <= FAITH_JOURNEYS.length &&
              v.faithJourney.every((item) => FAITH_JOURNEYS.some((choice) => choice.value === item))
            : FAITH_JOURNEYS.some((choice) => choice.value === v.faithJourney)));
      break;
    case 'tips':
      safe =
        object(v) &&
        typeof v.enabled === 'boolean' &&
        (v.lastShownAt === null ||
          (typeof v.lastShownAt === 'number' && Number.isFinite(v.lastShownAt))) &&
        object(v.seen) &&
        Object.keys(v.seen).length <= 100 &&
        Object.values(v.seen).every(
          (item) =>
            object(item) &&
            typeof item.at === 'number' &&
            Number.isFinite(item.at) &&
            (item.never === undefined || typeof item.never === 'boolean'),
        );
      break;
    case 'reminders':
      safe =
        object(v) &&
        typeof v.enabled === 'boolean' &&
        time(v.time) &&
        (v.lastNotified === null || typeof v.lastNotified === 'string') &&
        (v.reading === undefined ||
          (object(v.reading) &&
            typeof v.reading.enabled === 'boolean' &&
            time(v.reading.time) &&
            (v.reading.lastNotified === null || typeof v.reading.lastNotified === 'string')));
      break;
  }
  return safe ? ({ key, value: v } as SettingRecord) : null;
}
