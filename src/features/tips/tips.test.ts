import { ALL_FEATURES } from '@/app/features';
import { NOT_NOW_WAIT, TIP_GAP, pickTip, type TipContext } from './tips';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 20, 9).getTime();
const ctx = (over: Partial<TipContext> = {}): TipContext => ({
  now: NOW,
  tips: { enabled: true, lastShownAt: null, seen: {} },
  features: ALL_FEATURES,
  presenting: false,
  onboardedAt: NOW - 3 * DAY,
  counts: { 'chapter-read': 3, 'note-saved': 1, highlighted: 2 },
  parallel: null,
  activePlans: 0,
  ...over,
});

describe('feature tips', () => {
  it('suggests a tip at a natural moment', () => {
    expect(pickTip('chapter-read', ctx())?.id).toBe('plans');
    expect(pickTip('note-saved', ctx())?.id).toBe('journal-notes');
    expect(pickTip('highlighted', ctx())?.id).toBe('screen');
  });

  it('waits for enough of the moment', () => {
    expect(pickTip('chapter-read', ctx({ counts: { 'chapter-read': 2 } }))).toBeNull();
  });

  it('never on the first day, never while presenting, never when switched off', () => {
    expect(pickTip('note-saved', ctx({ onboardedAt: NOW - 60_000 }))).toBeNull();
    expect(pickTip('note-saved', ctx({ presenting: true }))).toBeNull();
    expect(
      pickTip('note-saved', ctx({ tips: { enabled: false, lastShownAt: null, seen: {} } })),
    ).toBeNull();
  });

  it('shows at most one a week', () => {
    const recent = { enabled: true, lastShownAt: NOW - TIP_GAP + DAY, seen: {} };
    expect(pickTip('note-saved', ctx({ tips: recent }))).toBeNull();
    const old = { enabled: true, lastShownAt: NOW - TIP_GAP - DAY, seen: {} };
    expect(pickTip('note-saved', ctx({ tips: old }))?.id).toBe('journal-notes');
  });

  it('respects Not now and Don’t show this again', () => {
    const later = { 'journal-notes': { at: NOW - NOT_NOW_WAIT + DAY } };
    expect(
      pickTip('note-saved', ctx({ tips: { enabled: true, lastShownAt: null, seen: later } })),
    ).toBeNull();
    const never = { 'journal-notes': { at: NOW - 400 * DAY, never: true } };
    expect(
      pickTip('note-saved', ctx({ tips: { enabled: true, lastShownAt: null, seen: never } })),
    ).toBeNull();
  });

  it('skips tips that no longer apply, and offers to turn features on', () => {
    // A plan is running: the parallel tip comes instead, once there have been enough chapters.
    expect(
      pickTip('chapter-read', ctx({ activePlans: 1, counts: { 'chapter-read': 6 } }))?.id,
    ).toBe('parallel');
    const tip = pickTip('highlighted', ctx({ features: { ...ALL_FEATURES, screen: false } }))!;
    expect(tip.action(ctx({ features: { ...ALL_FEATURES, screen: false } })).label).toBe(
      'Turn on Screen',
    );
  });
});
