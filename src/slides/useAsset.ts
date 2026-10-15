import { useEffect, useState } from 'react';
import { db } from '@/db/db';

interface Entry {
  url: string;
  mime: string;
  refs: number;
}

const entries = new Map<string, Promise<Entry | null>>();

async function acquire(id: string): Promise<Entry | null> {
  let p = entries.get(id);
  if (!p) {
    p = db.assets
      .get(id)
      .then((a) => (a ? { url: URL.createObjectURL(a.blob), mime: a.mime, refs: 0 } : null));
    entries.set(id, p);
  }
  const e = await p;
  if (e) e.refs++;
  else entries.delete(id);
  return e;
}

function release(id: string) {
  void entries.get(id)?.then((e) => {
    if (!e) return;
    e.refs--;
    // Keep URLs briefly so moving between slides doesn't reload images.
    if (e.refs <= 0) {
      setTimeout(() => {
        if (e.refs <= 0 && entries.get(id)) {
          URL.revokeObjectURL(e.url);
          entries.delete(id);
        }
      }, 30_000);
    }
  });
}

export interface AssetUrl {
  url: string;
  mime: string;
}

/** Object URL for a stored image or video, or null while loading / when missing. */
export function useAsset(id: string | undefined | null): AssetUrl | null | undefined {
  const [state, setState] = useState<{ id?: string | null; value: AssetUrl | null | undefined }>({
    id,
    value: undefined,
  });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void acquire(id).then((e) => {
      if (alive) setState({ id, value: e ? { url: e.url, mime: e.mime } : null });
    });
    return () => {
      alive = false;
      release(id);
    };
  }, [id]);
  if (!id) return null;
  return state.id === id ? state.value : undefined;
}

/** Warm the cache (PRD §7.6: the output preloads the next slide's images). */
export function preloadAsset(id: string): void {
  void acquire(id).then((e) => {
    if (!e) return;
    if (e.mime.startsWith('image/')) {
      const img = new Image();
      img.src = e.url;
      void img.decode?.().catch(() => {});
    }
    release(id);
  });
}
