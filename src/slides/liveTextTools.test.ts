import { verseTokens } from './liveTextTools';

const text = 'For God so loved the world that He gave His one and only Son';
const at = (w: string) => ({ start: text.indexOf(w), length: w.length });

describe('verseTokens', () => {
  it('covers the text exactly once', () => {
    expect(
      verseTokens(text, ['world'], [{ ...at('loved'), strong: 10025 }])
        .map((t) => t.text)
        .join(''),
    ).toBe(text);
  });

  it('keeps highlights and study underlines apart, and lets a word be both', () => {
    const tokens = verseTokens(
      text,
      ['loved'],
      [
        { ...at('loved'), strong: 10025 },
        { ...at('world'), strong: 12889 },
      ],
    );
    const find = (w: string) => tokens.find((t) => t.text === w)!;
    expect(find('loved')).toMatchObject({ emphasis: true, strong: 10025, word: true });
    expect(find('world')).toMatchObject({ emphasis: false, strong: 12889 });
    expect(find('God')).toMatchObject({ emphasis: false, strong: null });
  });

  it('underlines a study word of several words across its spaces', () => {
    const tokens = verseTokens(text, undefined, [{ ...at('one and only'), strong: 13439 }]);
    const inside = tokens.filter((t) => t.strong === 13439);
    expect(inside.map((t) => t.text).join('')).toBe('one and only');
    expect(tokens.find((t) => t.text === ' ' && t.strong === 13439)).toBeDefined();
  });
});
