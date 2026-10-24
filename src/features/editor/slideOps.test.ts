import type { StoredPresentation, StoredSlide } from '@/schema/presentation';
import { SLIDE_TYPES } from '@/schema/presentation';
import { SlideSchema } from '@/schema/presentation';
import {
  compatibleTypes,
  convertSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  newSlide,
  reorderSlides,
  slideIssues,
} from './slideOps';

const p = (slides: StoredSlide[]): StoredPresentation => ({ schemaVersion: 2, title: 'T', slides });
const s = (id: string, heading = id): StoredSlide => ({ id, type: 'point', heading });

it('new slides of every type are valid', () => {
  for (const t of SLIDE_TYPES) expect(SlideSchema.safeParse(newSlide(t)).success).toBe(true);
});

it('duplicates after the original with a new id', () => {
  const r = duplicateSlide(p([s('a'), s('b')]), 'a');
  expect(r.presentation.slides.map((x) => x.id)).toEqual(['a', r.id, 'b']);
  expect(r.presentation.slides[1]).toMatchObject({ heading: 'a' });
});

it('deletes but always keeps one slide', () => {
  const r = deleteSlide(p([s('a'), s('b')]), 'b');
  expect(r.presentation.slides.map((x) => x.id)).toEqual(['a']);
  expect(r.select).toBe('a');
  expect(deleteSlide(r.presentation, 'a').presentation.slides).toHaveLength(1);
});

it('reorders and moves', () => {
  const pres = p([s('a'), s('b'), s('c')]);
  expect(reorderSlides(pres, ['c', 'a', 'b']).slides.map((x) => x.id)).toEqual(['c', 'a', 'b']);
  expect(reorderSlides(pres, ['c', 'a'])).toBe(pres);
  expect(moveSlide(pres, 'a', 1).slides.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  expect(moveSlide(pres, 'a', -1)).toBe(pres);
});

it('converts between compatible types without losing content', () => {
  const point: StoredSlide = {
    id: 'x',
    type: 'point',
    heading: 'Grace',
    body: 'Undeserved favor',
    notes: 'n',
  };
  expect(convertSlide(point, 'closing')).toEqual({
    id: 'x',
    type: 'closing',
    heading: 'Grace',
    body: 'Undeserved favor',
    notes: 'n',
  });
  expect(convertSlide(point, 'title')).toMatchObject({
    type: 'title',
    subtitle: 'Undeserved favor',
  });
  expect(convertSlide(point, 'section')).toBeNull(); // body has no place
  expect(convertSlide({ id: 'q', type: 'quote', text: 'Short' }, 'statement')).toMatchObject({
    type: 'statement',
    text: 'Short',
  });
  expect(convertSlide({ id: 'q', type: 'quote', text: 'x'.repeat(120) }, 'statement')).toBeNull(); // too long
  expect(compatibleTypes({ id: 'h', type: 'section', heading: 'Hi' })).toEqual([
    'title',
    'point',
    'closing',
  ]);
});

it('reports issues for invalid edits', () => {
  expect(slideIssues({ id: 'a', type: 'point', heading: '' })).toEqual(["Heading can't be empty."]);
  expect(slideIssues(s('a'))).toEqual([]);
});
