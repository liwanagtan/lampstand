import type { LibraryRecord } from './presentations';

export function matches(r: LibraryRecord, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [r.title, r.speaker, r.data.series].some((v) => v?.toLowerCase().includes(needle));
}
