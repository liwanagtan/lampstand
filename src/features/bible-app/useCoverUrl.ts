import { useEffect, useState } from 'react';
import { backgroundUrl, loadBackgrounds } from '@/features/library/backgrounds';

/** The thumbnail URL for a bundled background id, once the manifest has loaded. */
export function useCoverUrl(id: string | undefined, size: 'thumb' | 'full' = 'thumb') {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    void loadBackgrounds().then((list) => {
      const e = list.find((b) => b.id === id);
      if (alive && e) setUrl(backgroundUrl(size === 'thumb' ? e.thumb : e.file));
    });
    return () => {
      alive = false;
    };
  }, [id, size]);
  return id ? url : null;
}
