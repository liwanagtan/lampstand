// Personal lines for the top bar and headers (docs/PRD-ADDENDUM-GROW.md, milestone 24).

const first = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** The Bible's top bar: "Morning reading, Ana". */
export function readingGreeting(name: string, now: Date): string {
  const h = now.getHours();
  const when =
    h >= 5 && h < 12
      ? 'Morning'
      : h >= 12 && h < 17
        ? 'Afternoon'
        : h >= 17 && h < 22
          ? 'Evening'
          : 'Quiet';
  const n = first(name);
  return n ? `${when} reading, ${n}` : `${when} reading`;
}

/** The Plans header: encouragement when plans are going, an invitation when not. */
export function plansGreeting(name: string, going: number): { title: string; line: string } {
  const n = first(name);
  if (going > 0)
    return {
      title: n ? `Keep going, ${n}` : 'Keep going',
      line: `${going} plan${going === 1 ? '' : 's'} going`,
    };
  return {
    title: n ? `A plan for you, ${n}` : 'A plan for you',
    line: 'Find one for where you are',
  };
}
