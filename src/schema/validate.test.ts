import sample from '../../tests/fixtures/sample-sermon.lampstand.json';
import { formatIssue, toExportJson, validatePresentation } from './validate';
import { SLIDE_TYPES } from './presentation';

const KNOWN = ['KJV', 'WEB', 'ASV', 'YLT', 'DBY'];

function withSlides(slides: unknown[], extra: Record<string, unknown> = {}) {
  return { schemaVersion: 2, title: 'Test', slides, ...extra };
}

function errorsOf(input: unknown): string[] {
  const r = validatePresentation(input, { knownTranslations: KNOWN, defaultTranslation: 'KJV' });
  if (r.ok) return [];
  return r.errors.map(formatIssue);
}

describe('sample sermon', () => {
  it('validates with zero errors and assigns slide ids', () => {
    const r = validatePresentation(sample, { knownTranslations: KNOWN });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.presentation.slides).toHaveLength(21);
    expect(new Set(r.presentation.slides.map((s) => s.id)).size).toBe(21);
    expect(r.warnings.every((w) => w.message.includes('several pages'))).toBe(true);
  });

  it('exercises every slide type', () => {
    expect(new Set(sample.slides.map((s) => s.type))).toEqual(new Set(SLIDE_TYPES));
  });

  it('round-trips through export', () => {
    const r = validatePresentation(sample);
    if (!r.ok) throw new Error('invalid');
    const again = validatePresentation(toExportJson(r.presentation));
    expect(again.ok).toBe(true);
    if (again.ok)
      expect(again.presentation.slides.map((s) => s.id)).toEqual(
        r.presentation.slides.map((s) => s.id),
      );
  });

  it('accepts JSON text wrapped in a markdown code fence', () => {
    expect(validatePresentation('```json\n' + JSON.stringify(sample) + '\n```').ok).toBe(true);
  });
});

describe('valid slide of each type', () => {
  it.each([
    [{ type: 'title', heading: 'Hello', subtitle: 'Sub', speaker: 'Pastor' }],
    [{ type: 'section', label: 'Point 1', heading: 'The Word reveals' }],
    [{ type: 'point', heading: 'Main idea', body: 'Detail' }],
    [{ type: 'list', heading: 'List', items: ['a', 'b'], reveal: true }],
    [{ type: 'reading', ref: 'John 3:16', translation: 'web', emphasis: ['so loved'] }],
    [{ type: 'quote', text: 'Quote', author: 'Someone' }],
    [{ type: 'statement', text: 'Bold line' }],
    [
      {
        type: 'image',
        background: { type: 'image', description: 'hills', motion: 'drift' },
        caption: 'x',
      },
    ],
    [{ type: 'countdown', minutes: 5, label: 'Soon' }],
    [{ type: 'closing', heading: 'Let us pray', body: 'Amen' }],
  ])('%o', (slide) => {
    expect(errorsOf(withSlides([slide]))).toEqual([]);
  });

  it('upper-cases translation codes', () => {
    const r = validatePresentation(
      withSlides([{ type: 'reading', ref: 'jn 3 16', translation: 'web' }]),
    );
    expect(r.ok && r.presentation.slides[0]).toMatchObject({ translation: 'WEB' });
  });
});

describe('errors by slide', () => {
  it('lists all three deliberate errors with slide numbers', () => {
    const errs = errorsOf(
      withSlides([
        { type: 'title', heading: 'Fine' },
        { type: 'point', heading: 'x'.repeat(72) },
        { type: 'statement', text: 'ok' },
        { type: 'list', heading: 'Too few', items: ['one'] },
        { type: 'point', heading: 'ok' },
        { type: 'point', heading: 'ok' },
        { type: 'reading', ref: 'Jhn 3:166' },
      ]),
    );
    expect(errs).toEqual([
      'Slide 2 (point): Heading is 72 characters; the limit is 60.',
      'Slide 4 (list): A list needs at least 2 items.',
      "Slide 7 (reading): 'Jhn 3:166' doesn't exist — John 3 has 36 verses.",
    ]);
  });

  it('reports unrecognized references in the PRD wording', () => {
    expect(errorsOf(withSlides([{ type: 'reading', ref: 'Hezekiah 3:16' }]))).toEqual([
      "Slide 1 (reading): 'Hezekiah 3:16' isn't a recognized reference.",
    ]);
  });

  it('rejects unknown fields so typos surface', () => {
    expect(errorsOf(withSlides([{ type: 'point', heading: 'x', bdy: 'typo' }]))).toEqual([
      'Slide 1 (point): unknown field "bdy". Check the spelling.',
    ]);
  });

  it('explains unknown slide types', () => {
    const [msg] = errorsOf(withSlides([{ type: 'pointt', heading: 'x' }]));
    expect(msg).toMatch(/^Slide 1: "pointt" isn't a slide type\. Use one of: title, section/);
  });

  it('explains missing required fields', () => {
    expect(errorsOf(withSlides([{ type: 'quote' }]))).toEqual([
      'Slide 1 (quote): Quote is required.',
    ]);
  });

  it.each([
    [{ type: 'list', heading: 'h', items: ['a', 'b', 'c', 'd', 'e', 'f'] }, /at most 5 items/],
    [
      { type: 'list', heading: 'h', items: ['a', 'x'.repeat(71)] },
      /List item is 71 characters; the limit is 70/,
    ],
    [
      { type: 'section', label: 'x'.repeat(21), heading: 'h' },
      /Label is 21 characters; the limit is 20/,
    ],
    [{ type: 'section', heading: 'x'.repeat(51) }, /limit is 50/],
    [{ type: 'point', heading: 'h', body: 'x'.repeat(161) }, /limit is 160/],
    [{ type: 'quote', text: 'x'.repeat(221) }, /limit is 220/],
    [{ type: 'statement', text: 'x'.repeat(91) }, /limit is 90/],
    [
      { type: 'image', background: { type: 'image', description: 'd' }, caption: 'x'.repeat(91) },
      /limit is 90/,
    ],
    [{ type: 'image', caption: 'no background' }, /Background is required/],
    [{ type: 'countdown', minutes: 0 }, /at least 1 minute/],
    [{ type: 'countdown', minutes: 31 }, /at most 30 minutes/],
    [{ type: 'countdown', minutes: 2.5 }, /whole number/],
    [{ type: 'closing', heading: 'x'.repeat(61) }, /limit is 60/],
    [{ type: 'title', heading: '' }, /can't be empty/],
    [{ type: 'point', heading: 'h', transition: 'spin' }, /must be one of: fade, rise, push, none/],
    [{ type: 'point', heading: 'h', background: { type: 'image' } }, /Description is required/],
    [
      { type: 'point', heading: 'h', background: { type: 'color', tone: '#fff' } },
      /must be one of: base, accent, deep/,
    ],
  ])('%o', (slide, pattern) => {
    const errs = errorsOf(withSlides([slide]));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(pattern);
  });
});

describe('file-level problems', () => {
  it('turns malformed JSON into one friendly message', () => {
    const errs = errorsOf('{ "schemaVersion": 1, "title": "x", ');
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^This isn't valid JSON/);
    expect(errs[0]).not.toMatch(/SyntaxError|Unexpected/);
  });

  it('explains empty files and non-objects', () => {
    expect(errorsOf('   ')).toEqual(['The file is empty.']);
    expect(errorsOf('[1,2]')[0]).toMatch(/doesn't look like a Lampstand presentation/);
  });

  it('requires a schema version and rejects newer ones', () => {
    expect(errorsOf({ title: 'x', slides: [] })[0]).toMatch(/schemaVersion is missing/);
    expect(errorsOf({ schemaVersion: 3, title: 'x', slides: [] })[0]).toMatch(
      /newer version of Lampstand/,
    );
  });

  it('checks presentation fields and extra references', () => {
    const errs = errorsOf(
      withSlides([{ type: 'statement', text: 'x' }], {
        date: '18/10/2026',
        extraRefs: ['jn 3 16', 'nope 1'],
      }),
    );
    expect(errs).toContain('Date must look like 2026-10-18.');
    expect(errs).toContain("Extra reference 2: 'nope 1' isn't a recognized reference.");
  });

  it('requires at least one slide', () => {
    expect(errorsOf(withSlides([]))).toEqual(['A presentation needs at least one slide.']);
  });
});

describe('warnings', () => {
  it('warns about long passages and uninstalled translations without failing', () => {
    const r = validatePresentation(
      withSlides([
        { type: 'reading', ref: 'Psalm 23', translation: 'NIV' },
        { type: 'reading', ref: 'John 3:1-21' },
      ]),
      { knownTranslations: KNOWN, defaultTranslation: 'KJV' },
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.map(formatIssue)).toEqual([
      'Slide 1 (reading): Psalm 23 has 6 verses; it will show across several pages.',
      'Slide 1 (reading): translation "NIV" isn\'t installed; KJV will be used.',
      'Slide 2 (reading): John 3:1–21 has 21 verses; it will show across several pages.',
    ]);
  });
});
