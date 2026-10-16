import { LESSON_MAX, useTv } from './tvStore';

describe('Bible TV lesson list', () => {
  beforeEach(() => useTv.getState().clearLesson());

  it('adds passages once, reorders and removes them', () => {
    const { addToLesson, moveInLesson, removeFromLesson } = useTv.getState();
    expect(addToLesson({ ref: 'JHN.3.16', translation: 'KJV' })).toBe(true);
    expect(addToLesson({ ref: 'JHN.3.16', translation: 'KJV' })).toBe(false);
    expect(addToLesson({ ref: 'PSA.23.1', translation: 'WEB' })).toBe(true);
    moveInLesson(1, -1);
    expect(useTv.getState().lesson.map((i) => i.ref)).toEqual(['PSA.23.1', 'JHN.3.16']);
    moveInLesson(0, -1);
    expect(useTv.getState().lesson[0]!.ref).toBe('PSA.23.1');
    removeFromLesson(0);
    expect(useTv.getState().lesson.map((i) => i.ref)).toEqual(['JHN.3.16']);
  });

  it('caps the list', () => {
    for (let v = 1; v <= LESSON_MAX + 5; v++)
      useTv.getState().addToLesson({ ref: `PSA.119.${v}`, translation: 'KJV' });
    expect(useTv.getState().lesson).toHaveLength(LESSON_MAX);
  });

  it('remembers the list across reloads', () => {
    useTv.getState().addToLesson({ ref: 'ROM.8.28', translation: 'KJV' });
    const saved = JSON.parse(localStorage.getItem('lampstand.bible-tv') ?? '{}');
    expect(saved.lesson).toEqual([{ ref: 'ROM.8.28', translation: 'KJV' }]);
  });
});
