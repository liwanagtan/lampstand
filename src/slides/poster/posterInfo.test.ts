import { posterDate, posterExcerpt, posterInfoFor } from './posterInfo';
import type { StoredPresentation } from '@/schema/presentation';

it('formats the poster date', () => {
  expect(posterDate('2026-10-18')).toBe('Sun · Oct 18');
  expect(posterDate(undefined)).toBeUndefined();
});

it('takes a short excerpt without cutting mid-sentence', () => {
  expect(posterExcerpt('Thy word is a lamp unto my feet, and a light unto my path.')).toBe(
    'Thy word is a lamp unto my feet, and a light unto my path.',
  );
  expect(
    posterExcerpt(
      'Trust in the Lord with all thine heart; and lean not unto thine own understanding.',
    ),
  ).toBe('Trust in the Lord with all thine heart.');
  expect(posterExcerpt('x'.repeat(200))).toBeUndefined();
});

it('finds the main verse from the first verse slide', () => {
  const p = {
    speaker: 'Pastor',
    date: '2026-10-18',
    slides: [
      { id: 'a', type: 'title', heading: 'T' },
      { id: 'b', type: 'verse', ref: 'Psalm 119:105', translation: 'web' },
    ],
  } as unknown as StoredPresentation;
  expect(posterInfoFor(p, 'KJV')).toMatchObject({
    mainRef: 'Psalm 119:105',
    mainTranslation: 'WEB',
    animated: true,
  });
});
