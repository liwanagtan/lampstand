import type MiniSearch from 'minisearch';
import { db } from '@/db/db';
import { buildIndex, searchIndex, type SearchDoc, type SearchHit } from './searchCore';
import type { SearchRequest } from './search.worker';

type Pending = { resolve: (hits: SearchHit[]) => void; reject: (err: Error) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (
      e: MessageEvent<{ id: number; ok: boolean; hits?: SearchHit[]; error?: string }>,
    ) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.hits ?? []);
      else p.reject(new Error(e.data.error));
    };
  } catch {
    worker = null;
  }
  return worker;
}

// Fallback when workers are unavailable (tests): build the index on this thread.
const local = new Map<string, Promise<MiniSearch<SearchDoc>>>();
function localIndex(code: string) {
  let p = local.get(code);
  if (!p) {
    p = db.verses
      .where('code')
      .equals(code)
      .toArray()
      .then((rows) =>
        buildIndex(rows.filter((r) => r.text).map((r) => ({ id: r.osis, text: r.text }))),
      );
    local.set(code, p);
  }
  return p;
}

type Req = SearchRequest extends infer R
  ? R extends { id: number }
    ? Omit<R, 'id'>
    : never
  : never;

function send(req: Req): Promise<SearchHit[]> {
  const w = getWorker();
  if (!w) {
    if (req.type === 'invalidate') {
      local.delete(req.code);
      return Promise.resolve([]);
    }
    return localIndex(req.code).then((index) =>
      req.type === 'search' ? searchIndex(index, req.query, req.limit) : [],
    );
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ ...req, id });
  });
}

/** Search verse text in one translation. The index is built on first use and cached. */
export function searchVerses(code: string, query: string, limit = 30): Promise<SearchHit[]> {
  return send({ type: 'search', code, query, limit });
}

/** Build the index ahead of time (e.g. when the control screen opens). */
export function warmSearch(code: string): Promise<unknown> {
  return send({ type: 'warm', code });
}

export function invalidateSearch(code: string): Promise<unknown> {
  return send({ type: 'invalidate', code });
}
