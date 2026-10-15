import { splitEmphasis } from './emphasis';

describe('splitEmphasis', () => {
  it('marks phrases case-insensitively without changing the text', () => {
    const runs = splitEmphasis('Thy word is a lamp unto my feet, and a light unto my path.', [
      'lamp',
      'Light',
    ]);
    expect(runs.filter((r) => r.emphasis).map((r) => r.text)).toEqual(['lamp', 'light']);
    expect(runs.map((r) => r.text).join('')).toBe(
      'Thy word is a lamp unto my feet, and a light unto my path.',
    );
  });

  it('treats special characters literally', () => {
    expect(splitEmphasis('a (b) c', ['(b)']).filter((r) => r.emphasis)).toHaveLength(1);
    expect(splitEmphasis('text', [])).toEqual([{ text: 'text', emphasis: false }]);
  });
});
