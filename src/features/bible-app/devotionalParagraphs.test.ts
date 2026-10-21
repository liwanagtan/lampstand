import { readFileSync } from 'node:fs';
import { devotionalParagraphs } from './devotionalParagraphs';

it('adds reading breaks while preserving every devotional’s wording', () => {
  const book = JSON.parse(readFileSync('public/devotionals/morning-evening.json', 'utf8'));
  for (const day of Object.values(book.days) as {
    morning: { body: string[] };
    evening: { body: string[] };
  }[]) {
    for (const reading of [day.morning, day.evening]) {
      expect(devotionalParagraphs(reading.body).join(' ').replace(/\s+/g, '').trim()).toBe(
        reading.body.join(' ').replace(/\s+/g, '').trim(),
      );
    }
  }
  expect(devotionalParagraphs(book.days['10-21'].evening.body).length).toBeGreaterThan(1);
});
it('preserves short original paragraphs', () => {
  expect(devotionalParagraphs(['A short thought.', 'Another thought.'])).toEqual([
    'A short thought.',
    'Another thought.',
  ]);
});
