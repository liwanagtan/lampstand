// "Verses for…": everyday topics and the passages readers rank highest (OpenBible.info
// Topical Bible, CC BY 4.0). Built by scripts/build-topics.ts.
import data from './topics.json';

export interface Topic {
  label: string;
  terms: string[];
  refs: string[];
}

const TOPICS: readonly Topic[] = data.topics;

/** Words match on their first four letters, so "worried" finds Worry and "lonely" Loneliness. */
const stem = (w: string) => w.toLowerCase().slice(0, 4);

/** Topics a search speaks to (at most two), best match first. */
export function matchTopics(query: string): Topic[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter((w) => w.length >= 4);
  if (!words.length) return [];
  const hits: { topic: Topic; exact: boolean }[] = [];
  for (const topic of TOPICS) {
    const names = [topic.label.toLowerCase(), ...topic.terms];
    const exact = names.some((n) => words.includes(n));
    const near = names.some((n) =>
      n.split(' ').some((part) => words.some((w) => stem(part) === stem(w))),
    );
    if (exact || near) hits.push({ topic, exact });
  }
  return hits
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .slice(0, 2)
    .map((h) => h.topic);
}
