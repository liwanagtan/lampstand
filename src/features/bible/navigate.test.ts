import { adjacentVerse } from './navigate';
import { defaultVerseCounts, parseRef, toOsis } from './ref';

const step = (ref: string, d: 1 | -1) => {
  const r = adjacentVerse(parseRef(ref)!, d, defaultVerseCounts);
  return r && toOsis(r);
};

it('steps to the next and previous verse', () => {
  expect(step('jn 3 16', 1)).toBe('JHN.3.17');
  expect(step('jn 3 16-18', 1)).toBe('JHN.3.19');
  expect(step('jn 3 16-18', -1)).toBe('JHN.3.15');
});

it('crosses chapter and book boundaries', () => {
  expect(step('jn 3 36', 1)).toBe('JHN.4.1');
  expect(step('jn 4 1', -1)).toBe('JHN.3.36');
  expect(step('mal 4 6', 1)).toBe('MAT.1.1');
  expect(step('mt 1 1', -1)).toBe('MAL.4.6');
  expect(step('rev 22 21', 1)).toBeNull();
  expect(step('gen 1 1', -1)).toBeNull();
});
