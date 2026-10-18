// Spurgeon's Morning and Evening (1865, public domain): loaded once, from the app's own files.
import { useEffect, useState } from 'react';

export interface ClassicReading {
  quote: string;
  reference: string;
  ref: string | null;
  body: string[];
}
interface Book {
  days: Record<string, { morning?: ClassicReading; evening?: ClassicReading }>;
}

let book: Promise<Book> | null = null;
const load = () =>
  (book ??= fetch(`${import.meta.env.BASE_URL}devotionals/morning-evening.json`).then((r) => {
    if (!r.ok) throw new Error('Morning and Evening is not available offline yet.');
    return r.json() as Promise<Book>;
  }));

/** "10-19" for a date. February 29 has its own readings. */
export const dayKey = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Morning until 5 pm, evening after. */
export const halfOfDay = (d: Date): 'morning' | 'evening' =>
  d.getHours() < 17 ? 'morning' : 'evening';

/** Today's two readings, once loaded; undefined while loading, null if unavailable. */
export function useMorningEvening(date: Date) {
  const key = dayKey(date);
  const [state, setState] = useState<{
    key: string;
    day: Book['days'][string] | null;
  } | null>(null);
  useEffect(() => {
    let alive = true;
    load()
      .then((b) => alive && setState({ key, day: b.days[key] ?? null }))
      .catch(() => alive && setState({ key, day: null }));
    return () => {
      alive = false;
    };
  }, [key]);
  return state?.key === key ? state.day : undefined;
}
