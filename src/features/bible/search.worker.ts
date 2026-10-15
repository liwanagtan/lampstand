/// <reference lib="webworker" />
import type MiniSearch from 'minisearch';
import { LampstandDB } from '@/db/db';
import { buildIndex, searchIndex, type SearchDoc } from './searchCore';

declare const self: DedicatedWorkerGlobalScope;

const db = new LampstandDB();
const indexes = new Map<string, Promise<MiniSearch<SearchDoc>>>();

function getIndex(code: string): Promise<MiniSearch<SearchDoc>> {
  let p = indexes.get(code);
  if (!p) {
    p = db.verses
      .where('code')
      .equals(code)
      .toArray()
      .then((rows) =>
        buildIndex(rows.filter((r) => r.text).map((r) => ({ id: r.osis, text: r.text }))),
      );
    indexes.set(code, p);
    // Keep at most two translations in memory.
    if (indexes.size > 2) indexes.delete(indexes.keys().next().value!);
  }
  return p;
}

export type SearchRequest =
  | { id: number; type: 'search'; code: string; query: string; limit?: number }
  | { id: number; type: 'warm'; code: string }
  | { id: number; type: 'invalidate'; code: string };

self.onmessage = async (e: MessageEvent<SearchRequest>) => {
  const req = e.data;
  try {
    if (req.type === 'invalidate') {
      indexes.delete(req.code);
      self.postMessage({ id: req.id, ok: true, hits: [] });
      return;
    }
    const index = await getIndex(req.code);
    const hits = req.type === 'search' ? searchIndex(index, req.query, req.limit) : [];
    self.postMessage({ id: req.id, ok: true, hits });
  } catch (err) {
    self.postMessage({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
