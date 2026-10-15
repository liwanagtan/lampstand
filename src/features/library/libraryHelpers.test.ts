import { matches } from './libraryHelpers';
import { fileNameFor } from './presentations';
import { mediaNeeds } from './importHelpers';
import type { LibraryRecord } from './presentations';
import type { StoredPresentation } from '@/schema/presentation';

const rec = (title: string, speaker?: string, series?: string) =>
  ({
    id: '1',
    title,
    speaker,
    data: { title, speaker, series, slides: [] },
    createdAt: 0,
    updatedAt: 0,
  }) as unknown as LibraryRecord;

it('searches title, speaker and series case-insensitively', () => {
  expect(matches(rec('A Lamp in the Dark', 'Pastor Daniel Cruz'), 'lamp')).toBe(true);
  expect(matches(rec('A Lamp in the Dark', 'Pastor Daniel Cruz'), 'DANIEL')).toBe(true);
  expect(matches(rec('Grace', undefined, 'The Living Word'), 'living')).toBe(true);
  expect(matches(rec('Grace'), 'hope')).toBe(false);
  expect(matches(rec('Grace'), '  ')).toBe(true);
});

it('makes safe file names', () => {
  expect(fileNameFor('A Lamp in the Dark')).toBe('a-lamp-in-the-dark.lampstand.json');
  expect(fileNameFor('Café & Crème: Part 2!')).toBe('cafe-creme-part-2.lampstand.json');
  expect(fileNameFor('!!!')).toBe('presentation.lampstand.json');
});

it('finds slides that still need a background', () => {
  const p = {
    slides: [
      { id: 'a', type: 'title', heading: 'x', background: { type: 'image', description: 'hills' } },
      {
        id: 'b',
        type: 'title',
        heading: 'x',
        background: { type: 'image', description: 'sea', assetId: 'bg-1' },
      },
      { id: 'c', type: 'statement', text: 'x', background: { type: 'gradient', tone: 'dawn' } },
      { id: 'd', type: 'image', background: { type: 'video', description: 'waves' } },
    ],
  } as unknown as StoredPresentation;
  expect(mediaNeeds(p).map((n) => [n.index, n.kind])).toEqual([
    [0, 'image'],
    [3, 'video'],
  ]);
});
