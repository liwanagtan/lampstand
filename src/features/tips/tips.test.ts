import { ALL_FEATURES } from '@/app/features';
import { NOT_NOW_WAIT, TIP_GAP, TIPS, pickTip, type TipContext } from './tips';
import type { TipLog } from './tipLog';

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 20, 9).getTime();
const times = (n: number, ago = DAY) => Array.from({ length: n }, (_, i) => NOW - ago - i * 1000);
const ctx = (over: Partial<TipContext> = {}): TipContext => ({
  now: NOW,
  tips: { enabled: true, lastShownAt: null, seen: {} },
  features: ALL_FEATURES,
  presenting: false,
  touring: false,
  onboardedAt: NOW - 3 * DAY,
  log: {},
  detail: {},
  parallel: null,
  activePlans: 1,
  remindersOn: false,
  ...over,
});
const withLog = (log: TipLog, over: Partial<TipContext> = {}) => ctx({ log, ...over });

describe('Ember’s tips', () => {
  it('comes just after the thing it builds on', () => {
    expect(pickTip('verse-selected', ctx({ detail: { words: true } }))?.id).toBe('words');
    expect(pickTip('verse-selected', ctx({ detail: { study: true } }))?.id).toBe('study');
    expect(pickTip('highlighted', withLog({ highlighted: times(1) }))?.id).toBe('colours');
    expect(pickTip('plan-started', ctx())?.id).toBe('pace');
  });

  it('never for a feature already used', () => {
    expect(
      pickTip('verse-selected', withLog({ 'words-opened': times(1) }, { detail: { words: true } })),
    ).toBeNull();
    expect(pickTip('plan-started', withLog({ 'pace-changed': times(1, 30 * DAY) }))).toBeNull();
  });

  it('waits for enough of the moment', () => {
    expect(pickTip('chapter-read', withLog({ 'chapter-read': times(2) }))).toBeNull();
    expect(pickTip('chapter-read', withLog({ 'chapter-read': times(3) }))?.id).toBe('compare');
    // Three chapters, but not this week: no comparing yet.
    expect(pickTip('chapter-read', withLog({ 'chapter-read': times(3, 10 * DAY) }))).toBeNull();
  });

  it('stays quiet on the first day, during the tour, while presenting, or when off', () => {
    const moment = { detail: { words: true } };
    expect(pickTip('verse-selected', ctx({ ...moment, onboardedAt: NOW - 60_000 }))).toBeNull();
    expect(pickTip('verse-selected', ctx({ ...moment, touring: true }))).toBeNull();
    expect(pickTip('verse-selected', ctx({ ...moment, presenting: true }))).toBeNull();
    const off = { enabled: false, lastShownAt: null, seen: {} };
    expect(pickTip('verse-selected', ctx({ ...moment, tips: off }))).toBeNull();
  });

  it('shows at most one a week', () => {
    const moment = { detail: { words: true } };
    const recent = { enabled: true, lastShownAt: NOW - TIP_GAP + DAY, seen: {} };
    expect(pickTip('verse-selected', ctx({ ...moment, tips: recent }))).toBeNull();
    const old = { enabled: true, lastShownAt: NOW - TIP_GAP - DAY, seen: {} };
    expect(pickTip('verse-selected', ctx({ ...moment, tips: old }))?.id).toBe('words');
  });

  it('Not now waits three weeks; a tip acted on never returns', () => {
    const moment = { detail: { words: true } };
    const later = { words: { at: NOW - NOT_NOW_WAIT + DAY } };
    expect(
      pickTip(
        'verse-selected',
        ctx({ ...moment, tips: { enabled: true, lastShownAt: null, seen: later } }),
      ),
    ).toBeNull();
    const done = { words: { at: NOW - 400 * DAY, never: true } };
    expect(
      pickTip(
        'verse-selected',
        ctx({ ...moment, tips: { enabled: true, lastShownAt: null, seen: done } }),
      ),
    ).toBeNull();
  });

  it('gives every tip one of the three buttons, and offers to turn features on', () => {
    for (const tip of TIPS) expect(['guide', 'do', 'got']).toContain(tip.action(ctx()).kind);
    const screen = TIPS.find((t) => t.id === 'screen')!;
    const action = screen.action(ctx({ features: { ...ALL_FEATURES, screen: false } }));
    expect(action.kind === 'do' && action.label).toBe('Turn on Screen');
  });
});
