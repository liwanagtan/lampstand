import { snippetRuns } from './snippet';

describe('verse snippets', () => {
  it('keeps short leads and trims long ones to just before the match', () => {
    expect(
      snippetRuns([
        { text: 'Peace', hit: true },
        { text: ' be still', hit: false },
      ]),
    ).toEqual([
      { text: 'Peace', hit: true },
      { text: ' be still', hit: false },
    ]);
    const long = snippetRuns([
      {
        text: 'They have healed also the hurt of the daughter of my people slightly, saying, ',
        hit: false,
      },
      { text: 'Peace', hit: true },
    ]);
    expect(long[0]!.text.startsWith('…')).toBe(true);
    expect(long[0]!.text.length).toBeLessThanOrEqual(30);
    expect(long[1]).toEqual({ text: 'Peace', hit: true });
  });
});
