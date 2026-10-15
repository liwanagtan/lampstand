export interface Run {
  text: string;
  emphasis: boolean;
}

/** Splits text into runs, marking case-insensitive matches of the emphasis phrases. */
export function splitEmphasis(text: string, phrases: readonly string[] | undefined): Run[] {
  const clean = (phrases ?? []).map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return [{ text, emphasis: false }];
  const escaped = clean
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]"));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const runs: Run[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), emphasis: false });
    runs.push({ text: m[0], emphasis: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), emphasis: false });
  return runs;
}
