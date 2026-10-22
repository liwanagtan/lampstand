import { versesFromContent } from './nlt';

it('keeps verse text in order across API paragraph and character nodes', () => {
  const verses = versesFromContent([
    {
      type: 'tag',
      items: [
        { type: 'text', attrs: { verseId: 'JHN.1.1' }, text: 'The Word was with God,' },
        {
          type: 'tag',
          items: [{ type: 'text', attrs: { verseId: 'JHN.1.1' }, text: 'and the Word was God.' }],
        },
        { type: 'text', attrs: { verseId: 'JHN.1.2' }, text: 'He was there.' },
      ],
    },
  ]);
  expect(verses.get('JHN.1.1')).toBe('The Word was with God, and the Word was God.');
  expect(verses.get('JHN.1.2')).toBe('He was there.');
});
