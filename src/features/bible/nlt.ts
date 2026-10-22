import type { LampstandDB } from '@/db/db';
import type { TranslationRecord } from '@/db/types';
import type { SearchHit } from './searchCore';

export const NLT_CODE = 'NLT';
export const NLT_LICENSE =
  'Scripture quotations marked (NLT) are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.';

const MAX_AGE = 14 * 24 * 60 * 60 * 1000;
type CacheInfo = { fetchedAt: number; fumsToken: string; copyright: string };
type ContentNode = {
  type?: string;
  text?: string;
  attrs?: { verseId?: string };
  items?: ContentNode[];
};

const metadataKey = (book: string, chapter: number) => `lampstand.nlt.v2.${book}.${chapter}`;

function readMetadata(book: string, chapter: number): CacheInfo | null {
  try {
    const raw = localStorage.getItem(metadataKey(book, chapter));
    return raw ? (JSON.parse(raw) as CacheInfo) : null;
  } catch {
    return null;
  }
}

function trackView(token: string) {
  if (!token || typeof document === 'undefined') return;
  const global = window as typeof window & {
    fums?: (...args: unknown[]) => void;
    fumsData?: unknown[];
  };
  global.fumsData ??= [];
  global.fums ??= (...args: unknown[]) => global.fumsData!.push(args);
  if (!document.querySelector('script[data-api-bible-fums]')) {
    const script = document.createElement('script');
    script.dataset.apiBibleFums = '';
    script.src = 'https://pkg.api.bible/fumsV3.min.js';
    script.async = true;
    document.head.appendChild(script);
  }
  global.fums('trackView', token);
}

export function versesFromContent(nodes: ContentNode[]): Map<string, string> {
  const result = new Map<string, string>();
  const visit = (node: ContentNode) => {
    if (node.type === 'text' && node.attrs?.verseId && node.text) {
      const id = node.attrs.verseId;
      const previous = result.get(id) ?? '';
      const separator =
        previous &&
        !/\s$/.test(previous) &&
        !/^\s/.test(node.text) &&
        !/^[,.;:!?)\]’”]/.test(node.text)
          ? ' '
          : '';
      result.set(id, previous + separator + node.text);
    }
    node.items?.forEach(visit);
  };
  nodes.forEach(visit);
  return result;
}

export async function nltAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/nlt/status', { cache: 'no-store' });
    return response.ok && ((await response.json()) as { available?: boolean }).available === true;
  } catch {
    return false;
  }
}

export async function installNltMetadata(db: LampstandDB): Promise<void> {
  if (!(await nltAvailable())) return;
  const existing = await db.translations.get(NLT_CODE);
  if (existing?.source === 'API.Bible') return;
  const reference = await db.translations.get('BSB');
  if (!reference) return;
  const record: TranslationRecord = {
    code: NLT_CODE,
    name: 'New Living Translation',
    language: 'en',
    license: NLT_LICENSE,
    source: 'API.Bible',
    bundled: true,
    books: reference.books,
    verseCount: reference.verseCount,
    importedAt: Date.now(),
  };
  await db.translations.put(record);
}

export async function ensureNltChapters(
  db: LampstandDB,
  ids: string[],
): Promise<string | undefined> {
  const chapters = new Map<string, [string, number]>();
  ids.forEach((id) => {
    const [book, rawChapter] = id.split('.');
    const chapter = Number(rawChapter);
    chapters.set(`${book}.${chapter}`, [book!, chapter]);
  });
  let copyright: string | undefined;
  for (const [book, chapter] of chapters.values()) {
    let info = readMetadata(book, chapter);
    if (info && !(await db.verses.get([NLT_CODE, `${book}.${chapter}.1`]))) info = null;
    if (!info || Date.now() - info.fetchedAt >= MAX_AGE) {
      const response = await fetch(`/api/nlt/chapter/${book}/${chapter}`, { cache: 'no-store' });
      if (!response.ok)
        throw new Error('NLT needs an internet connection to refresh this chapter.');
      const payload = (await response.json()) as {
        data: { content: ContentNode[]; copyright: string };
        meta: { fumsToken: string };
      };
      const rows = [...versesFromContent(payload.data.content)].map(([osis, text]) => ({
        code: NLT_CODE,
        osis,
        text,
      }));
      await db.verses.bulkPut(rows);
      info = {
        fetchedAt: Date.now(),
        fumsToken: payload.meta.fumsToken,
        copyright: payload.data.copyright,
      };
      localStorage.setItem(metadataKey(book, chapter), JSON.stringify(info));
    }
    copyright = info.copyright;
    trackView(info.fumsToken);
  }
  return copyright;
}

export async function searchNlt(query: string, limit = 30): Promise<SearchHit[]> {
  const response = await fetch(`/api/nlt/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('NLT search needs an internet connection.');
  const result = (await response.json()) as {
    data: { verses?: { id: string; text: string }[] };
    meta?: { fumsToken?: string };
  };
  if (result.meta?.fumsToken) trackView(result.meta.fumsToken);
  return (result.data.verses ?? []).slice(0, limit).map((verse, index) => ({
    osis: verse.id,
    text: verse.text,
    terms: [],
    score: 1 / (index + 1),
    exact: false,
  }));
}
