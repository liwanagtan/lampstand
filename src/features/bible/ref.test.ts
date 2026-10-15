import { formatRef, fromOsis, parseRef, parseRefDetailed, toOsis, versesInRange } from './ref';

const KNOWN = ['KJV', 'WEB', 'ASV', 'YLT', 'DBY'];

function osis(input: string) {
  const r = parseRef(input);
  return r && toOsis(r);
}

describe('parseRef', () => {
  it.each([
    ['jn 3 16', 'JHN.3.16'],
    ['john 3:16', 'JHN.3.16'],
    ['Jn3:16-18', 'JHN.3.16-JHN.3.18'],
    ['1 cor 13 4-7', '1CO.13.4-1CO.13.7'],
    ['1co13:4', '1CO.13.4'],
    ['ps 23', 'PSA.23.1-PSA.23.6'],
    ['rom 8:28', 'ROM.8.28'],
    ['Psalm 119:105', 'PSA.119.105'],
    ['Proverbs 3:5-6', 'PRO.3.5-PRO.3.6'],
    ['jude 5', 'JUD.1.5'],
    ['John 3:16-4:2', 'JHN.3.16-JHN.4.2'],
    ['2 Timothy 3:16', '2TI.3.16'],
    ['Matthew 5:14-16', 'MAT.5.14-MAT.5.16'],
  ])('%s → %s', (input, expected) => {
    expect(osis(input)).toBe(expected);
  });

  it('returns null for text that is not a reference', () => {
    expect(parseRef('so loved')).toBeNull();
    expect(parseRef('')).toBeNull();
  });
});

describe('parseRefDetailed', () => {
  it('peels a trailing translation code', () => {
    const r = parseRefDetailed('jn 3 16 web', { knownTranslations: KNOWN });
    expect(r.ok && r.translation).toBe('WEB');
    const r2 = parseRefDetailed('ps 23 1-3 asv', { knownTranslations: KNOWN });
    expect(r2.ok && toOsis(r2.range)).toBe('PSA.23.1-PSA.23.3');
    expect(r2.ok && r2.translation).toBe('ASV');
    const r3 = parseRefDetailed('jn 3 16 darby', { knownTranslations: KNOWN });
    expect(r3.ok && r3.translation).toBe('DBY');
  });

  it('gives a verse-count hint for verses that do not exist', () => {
    const r = parseRefDetailed('jn 3 99');
    expect(r).toEqual({ ok: false, problem: 'verse', hint: 'John 3 has 36 verses.' });
  });

  it('gives a chapter-count hint', () => {
    const r = parseRefDetailed('ps 151');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.hint).toBe('Psalms has 150 chapters.');
  });

  it('rejects several passages at once', () => {
    expect(parseRefDetailed('jn 3:16, 18').ok).toBe(false);
  });

  it('clamps an end verse past the chapter end', () => {
    const r = parseRefDetailed('jn 3 16-99');
    expect(r.ok && toOsis(r.range)).toBe('JHN.3.16-JHN.3.36');
  });
});

describe('formatRef', () => {
  it.each([
    ['jn 3 16', 'John 3:16'],
    ['jn 3 16-18', 'John 3:16–18'],
    ['ps 23', 'Psalm 23'],
    ['ps 23 1-3', 'Psalm 23:1–3'],
    ['John 3:16-4:2', 'John 3:16–4:2'],
    ['jude 5', 'Jude 5'],
    ['1 cor 13 4-7', '1 Corinthians 13:4–7'],
  ])('%s → %s', (input, expected) => {
    expect(formatRef(parseRef(input)!)).toBe(expected);
  });
});

describe('osis round trip and expansion', () => {
  it('round-trips canonical ids', () => {
    expect(toOsis(fromOsis('JHN.3.16-JHN.3.18')!)).toBe('JHN.3.16-JHN.3.18');
    expect(fromOsis('XYZ.1.1')).toBeNull();
  });

  it('expands ranges across chapters', () => {
    const v = versesInRange(parseRef('John 3:35-4:2')!);
    expect(v).toEqual(['JHN.3.35', 'JHN.3.36', 'JHN.4.1', 'JHN.4.2']);
    expect(versesInRange(parseRef('ps 23')!)).toHaveLength(6);
  });
});
