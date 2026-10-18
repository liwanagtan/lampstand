// Verse previews start just before the first matching word, so the match is always in view.

export interface Run {
  text: string;
  hit: boolean;
}

export function snippetRuns(runs: readonly Run[], lead = 28): Run[] {
  const first = runs.findIndex((r) => r.hit);
  if (first <= 0) return [...runs];
  const before = runs
    .slice(0, first)
    .map((r) => r.text)
    .join('');
  if (before.length <= lead) return [...runs];
  // Cut at a word boundary within the last `lead` characters before the match.
  const tail = before.slice(-lead);
  const space = tail.indexOf(' ');
  const kept = space >= 0 ? tail.slice(space + 1) : tail;
  return [{ text: `…${kept}`, hit: false }, ...runs.slice(first)];
}
