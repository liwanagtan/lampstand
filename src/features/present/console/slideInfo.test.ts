import type { StoredSlide } from '@/schema/presentation';
import { nextBeat, slideKind, slideTitle } from './slideInfo';

const slides = [
  { id: 'a', type: 'point', heading: 'Light shows what is there' },
  {
    id: 'b',
    type: 'list',
    heading: 'How the Word guides us',
    items: ['Warns', 'Corrects'],
    reveal: true,
  },
  { id: 'c', type: 'reading', ref: 'Psalm 119:105' },
  { id: 'd', type: 'statement', text: 'Open the Word first.' },
] as StoredSlide[];
const pages = (s: StoredSlide) => (s.id === 'c' ? 2 : 1);

describe('Next means next', () => {
  it('Next always previews the next slide, independently of reveal progress', () => {
    expect(nextBeat(slides, 1, 0, 0, pages)).toMatchObject({
      index: 2,
      buildStep: 0,
    });
    expect(nextBeat(slides, 1, 1, 0, pages)).toMatchObject({
      index: 2,
      buildStep: 0,
    });
    expect(nextBeat(slides, 1, 2, 0, pages)).toMatchObject({ index: 2, buildStep: 0, page: 0 });
  });

  it('Next previews the next slide even when reading pages remain', () => {
    expect(nextBeat(slides, 2, 0, 0, pages)).toMatchObject({
      index: 3,
      page: 0,
    });
    expect(nextBeat(slides, 2, 0, 1, pages)?.label).toBe(
      'Slide 4 · Statement · Open the Word first.',
    );
  });

  it('has nothing after the last slide', () => {
    expect(nextBeat(slides, 3, 0, 0, pages)).toBeNull();
  });

  it('names slides plainly for the rail', () => {
    expect(slideKind(slides[1]!)).toBe('List · 2');
    expect(slideTitle(slides[2]!)).toBe('Psalm 119:105');
  });
});
