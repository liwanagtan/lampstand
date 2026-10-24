import rich from '../../tests/fixtures/rich-toward-god.lampstand.json';
import { validatePresentation, toExportJson } from './validate';
import { upgradeStoredPresentation } from './upgradeStored';

const file = (slide: unknown) => ({ schemaVersion: 2, title: 'Test', slides: [slide] });

it('imports all 22 slides from Rich Toward God without dropping v2 content', () => {
  const result = validatePresentation(rich);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  expect(result.presentation.slides).toHaveLength(22);
  expect(result.presentation.slides[1]?.type).toBe('reading');
  expect(result.presentation.slides[10]).toMatchObject({
    reveal: true,
    verses: [{ ref: 'James 4:14-15' }],
  });
  expect(result.presentation.slides[15]).toMatchObject({
    panel: 'bottom',
    verses: [{ ref: '2 Corinthians 8:9' }],
  });
  const again = validatePresentation(toExportJson(result.presentation));
  expect(again.ok && again.presentation).toEqual(result.presentation);
});

it('refuses external v1 files and old v2 field names', () => {
  const old = validatePresentation({ ...rich, schemaVersion: 1 });
  expect(!old.ok && old.errors[0]?.message).toContain('old Lampstand slide format');
  expect(validatePresentation(file({ type: 'verse', ref: 'John 3:16' })).ok).toBe(false);
  expect(
    validatePresentation(file({ type: 'list', heading: 'Test', items: ['a', 'b'], build: true }))
      .ok,
  ).toBe(false);
});

it('validates attached references, panel choice and total verse count', () => {
  for (const verses of [
    [{ ref: 'John 3:166' }],
    [{ ref: 'John 3:16-19' }],
    [{ ref: 'John 3:16-17' }, { ref: 'Psalm 23:1-2' }],
  ]) {
    expect(validatePresentation(file({ type: 'point', heading: 'Test', verses })).ok).toBe(false);
  }
  expect(validatePresentation(file({ type: 'point', heading: 'Test', panel: 'bottom' })).ok).toBe(
    false,
  );
  expect(
    validatePresentation(
      file({ type: 'point', heading: 'Test', verses: [{ ref: 'John 3:16-18' }], panel: 'side' }),
    ).ok,
  ).toBe(true);
});

it('preserves IDs, notes, backgrounds and reveal choices in existing saved decks', () => {
  const old = {
    schemaVersion: 1,
    title: 'Saved',
    slides: [
      { id: 'a', type: 'verse', ref: 'John 3:16', notes: 'Keep this' },
      { id: 'b', type: 'list', heading: 'Test', items: ['a', 'b'], build: true },
    ],
  };
  const upgraded = upgradeStoredPresentation(old);
  expect(upgraded).toMatchObject({
    schemaVersion: 2,
    slides: [
      { id: 'a', type: 'reading', notes: 'Keep this' },
      { id: 'b', reveal: true },
    ],
  });
  expect(old.slides[0]?.type).toBe('verse');
  expect(validatePresentation(upgraded).ok).toBe(true);
});
