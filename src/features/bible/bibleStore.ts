import { create } from 'zustand';
import { db } from '@/db/db';
import type { TranslationRecord } from '@/db/types';
import { TranslationFileSchema, type TranslationFile } from '@/schema/translation';
import { installTranslation, removeTranslation } from './install';
import { clearPassageCache } from './passage';
import { installNltMetadata } from './nlt';
import { useSettings } from '@/features/settings/settingsStore';
import { useReader } from '@/features/bible-app/readerStore';

export interface BibleManifest {
  version: number;
  translations: {
    code: string;
    name: string;
    file: string;
    hash: string;
    bytes: number;
    verses: number;
  }[];
}

export type BibleStatus = 'idle' | 'checking' | 'preparing' | 'ready' | 'error';

interface BibleState {
  status: BibleStatus;
  translations: TranslationRecord[];
  progress: { done: number; total: number; name: string; fraction: number };
  error?: string;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  importFile: (file: File) => Promise<TranslationRecord>;
  remove: (code: string) => Promise<void>;
}

const ORDER = ['NLT', 'KJV', 'BSB', 'WEB'];
const RETIRED = new Set(['ASV', 'YLT', 'DBY']);
const sortTranslations = (list: TranslationRecord[]) =>
  list
    .filter((t) => !RETIRED.has(t.code))
    .sort((a, b) => {
      const ia = ORDER.indexOf(a.code);
      const ib = ORDER.indexOf(b.code);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.code.localeCompare(b.code);
    });

const BASE = import.meta.env.BASE_URL ?? '/';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return (await res.json()) as T;
}

let initPromise: Promise<void> | null = null;

export const useBible = create<BibleState>((set, get) => ({
  status: 'idle',
  translations: [],
  progress: { done: 0, total: 0, name: '', fraction: 0 },

  refresh: async () => {
    const translations = sortTranslations(await db.translations.toArray());
    if (!translations.some((t) => t.code === 'NLT')) {
      if (useSettings.getState().defaultTranslation === 'NLT')
        await useSettings.getState().set('defaultTranslation', 'KJV');
      if (useReader.getState().translation === 'NLT') useReader.getState().setTranslation('KJV');
    }
    if (RETIRED.has(useSettings.getState().defaultTranslation))
      await useSettings.getState().set('defaultTranslation', 'KJV');
    if (RETIRED.has(useReader.getState().translation)) useReader.getState().setTranslation('KJV');
    if (useReader.getState().parallel && RETIRED.has(useReader.getState().parallel!))
      useReader.getState().setParallel(null);
    set({ translations });
  },

  init: () => {
    initPromise ??= (async () => {
      set({ status: 'checking' });
      try {
        const installed = new Map((await db.translations.toArray()).map((t) => [t.code, t]));
        let manifest: BibleManifest | null = null;
        try {
          manifest = await fetchJson<BibleManifest>('bibles/index.json');
        } catch (err) {
          // Offline before the service worker cached the manifest: use what is installed.
          if (installed.size === 0) throw err;
        }
        const todo = (manifest?.translations ?? []).filter(
          (t) => installed.get(t.code)?.hash !== t.hash,
        );
        if (todo.length > 0) {
          set({
            status: 'preparing',
            progress: { done: 0, total: todo.length, name: todo[0]!.name, fraction: 0 },
          });
          for (const [i, entry] of todo.entries()) {
            set({ progress: { done: i, total: todo.length, name: entry.name, fraction: 0 } });
            const file = await fetchJson<TranslationFile>(`bibles/${entry.file}`);
            await installTranslation(db, file, {
              bundled: true,
              hash: entry.hash,
              onProgress: (fraction) =>
                set({ progress: { done: i, total: todo.length, name: entry.name, fraction } }),
            });
          }
          clearPassageCache();
          set({ progress: { done: todo.length, total: todo.length, name: '', fraction: 1 } });
        }
        await installNltMetadata(db);
        await get().refresh();
        set({ status: 'ready', error: undefined });
      } catch (err) {
        initPromise = null;
        set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    })();
    return initPromise;
  },

  importFile: async (file) => {
    if (file.size > 30 * 1024 * 1024)
      throw new Error('That file is too large to be a translation (over 30 MB).');
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new Error(
        "This isn't valid JSON. Translation files use the Lampstand translation format.",
      );
    }
    const parsed = TranslationFileSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new Error(
        `This isn't a valid Lampstand translation file: ${first?.message ?? 'unknown problem'}`,
      );
    }
    if (RETIRED.has(parsed.data.code))
      throw new Error(`${parsed.data.code} is no longer available in Lampstand.`);
    const existing = get().translations.find((t) => t.code === parsed.data.code);
    if (existing?.bundled)
      throw new Error(`${parsed.data.code} is built in and can't be replaced.`);
    const record = await installTranslation(db, parsed.data, { bundled: false });
    clearPassageCache();
    await get().refresh();
    return record;
  },

  remove: async (code) => {
    const t = get().translations.find((x) => x.code === code);
    if (!t || t.bundled) return;
    await removeTranslation(db, code);
    clearPassageCache();
    await get().refresh();
  },
}));

export function getTranslation(code: string | undefined): TranslationRecord | undefined {
  const list = useBible.getState().translations;
  return list.find((t) => t.code === code?.toUpperCase());
}

/** The translation to use: the requested one if installed, else the default, else the first. */
export function resolveTranslation(
  code: string | undefined,
  fallback: string,
): TranslationRecord | undefined {
  const list = useBible.getState().translations;
  return getTranslation(code) ?? getTranslation(fallback) ?? list[0];
}
