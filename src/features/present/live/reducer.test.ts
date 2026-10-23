import sample from '../../../../tests/fixtures/sample-sermon.lampstand.json';
import { validatePresentation } from '@/schema/validate';
import { liveReducer, type LiveAction, type LiveContext } from './reducer';
import { INITIAL_LIVE, type LiveState } from './types';

const r = validatePresentation(sample);
if (!r.ok) throw new Error('invalid sample');
const presentation = r.presentation;
const NOW = 1_000_000;

function ctx(overrides: Partial<LiveContext> = {}): LiveContext {
  return {
    presentation,
    slidePages: () => 1,
    overlayPages: () => 3,
    now: () => NOW,
    ...overrides,
  };
}

function run(actions: LiveAction[], c = ctx(), start: LiveState = INITIAL_LIVE): LiveState {
  return actions.reduce((s, a) => liveReducer(s, a, c), start);
}

const load: LiveAction = { type: 'load', presentationId: 'p1', presentation, theme: 'classic' };
const listIndex = presentation.slides.findIndex((s) => s.type === 'list');

describe('liveReducer', () => {
  it('loads at the first slide and starts its countdown', () => {
    const s = run([load]);
    expect(s).toMatchObject({
      presentationId: 'p1',
      slideIndex: 0,
      screen: 'content',
      overlay: null,
    });
    expect(s.countdownEndsAt).toBe(NOW + 5 * 60_000);
  });

  it('next and prev move between slides and clear the countdown', () => {
    const s = run([load, { type: 'next' }]);
    expect(s.slideIndex).toBe(1);
    expect(s.countdownEndsAt).toBeNull();
    expect(run([load, { type: 'next' }, { type: 'prev' }]).slideIndex).toBe(0);
  });

  it('stops at both ends', () => {
    expect(run([load, { type: 'prev' }]).slideIndex).toBe(0);
    const last = presentation.slides.length - 1;
    const s = run([load, { type: 'goTo', index: last }, { type: 'next' }]);
    expect(s.slideIndex).toBe(last);
  });

  it('reveals build items one per Next before advancing', () => {
    const items = (presentation.slides[listIndex] as { items: string[] }).items.length;
    let s = run([load, { type: 'goTo', index: listIndex }]);
    expect(s.buildStep).toBe(0);
    for (let i = 1; i <= items; i++) {
      s = liveReducer(s, { type: 'next' }, ctx());
      expect(s.slideIndex).toBe(listIndex);
      expect(s.buildStep).toBe(i);
    }
    s = liveReducer(s, { type: 'next' }, ctx());
    expect(s.slideIndex).toBe(listIndex + 1);
  });

  it('going back into a build list shows it fully built, then steps back', () => {
    const items = (presentation.slides[listIndex] as { items: string[] }).items.length;
    let s = run([load, { type: 'goTo', index: listIndex + 1 }, { type: 'prev' }]);
    expect(s).toMatchObject({ slideIndex: listIndex, buildStep: items });
    s = liveReducer(s, { type: 'prev' }, ctx());
    expect(s.buildStep).toBe(items - 1);
  });

  it('walks through the pages of a long verse slide', () => {
    const c = ctx({ slidePages: (slide) => (slide.type === 'verse' ? 2 : 1) });
    const verse = presentation.slides.findIndex((s) => s.type === 'verse');
    let s = run([load, { type: 'goTo', index: verse }], c);
    s = liveReducer(s, { type: 'next' }, c);
    expect(s).toMatchObject({ slideIndex: verse, slidePage: 1 });
    s = liveReducer(s, { type: 'next' }, c);
    expect(s).toMatchObject({ slideIndex: verse + 1, slidePage: 0 });
  });

  it('blank and logo toggle over anything and return', () => {
    let s = run([load, { type: 'toggleScreen', screen: 'blank' }]);
    expect(s.screen).toBe('blank');
    s = liveReducer(s, { type: 'toggleScreen', screen: 'logo' }, ctx());
    expect(s.screen).toBe('logo');
    s = liveReducer(s, { type: 'toggleScreen', screen: 'logo' }, ctx());
    expect(s.screen).toBe('content');
  });

  it('shows, pages, switches and clears a verse overlay without touching the slide', () => {
    let s = run([load, { type: 'next' }]);
    s = liveReducer(
      s,
      { type: 'showOverlay', overlay: { ref: 'JHN.3.16', translation: 'KJV', mode: 'lowerThird' } },
      ctx(),
    );
    expect(s.overlay).toEqual({ ref: 'JHN.3.16', translation: 'KJV', mode: 'lowerThird', page: 0 });
    s = liveReducer(s, { type: 'overlayPage', delta: 1 }, ctx());
    s = liveReducer(s, { type: 'overlayPage', delta: 1 }, ctx());
    s = liveReducer(s, { type: 'overlayPage', delta: 1 }, ctx());
    expect(s.overlay?.page).toBe(2);
    s = liveReducer(s, { type: 'overlayMode', mode: 'sidePanel' }, ctx({ overlayPages: () => 2 }));
    expect(s.overlay).toMatchObject({ mode: 'sidePanel', page: 1 });
    s = liveReducer(s, { type: 'overlayTranslation', translation: 'WEB' }, ctx());
    expect(s.overlay).toMatchObject({ translation: 'WEB', page: 0 });
    s = liveReducer(s, { type: 'clearOverlay' }, ctx());
    expect(s.overlay).toBeNull();
    expect(s.slideIndex).toBe(1);
  });

  it('returns the same object when nothing changes', () => {
    const s = run([load]);
    expect(liveReducer(s, { type: 'clearOverlay' }, ctx())).toBe(s);
    expect(liveReducer(s, { type: 'prev' }, ctx())).toBe(s);
  });

  it('sets and clears live emphasis on the overlay only', () => {
    const shown: LiveAction = {
      type: 'showOverlay',
      overlay: { ref: 'JHN.3.16', translation: 'KJV', mode: 'fullScreen' },
    };
    expect(run([{ type: 'overlayEmphasis', emphasis: ['loved'] }]).overlay).toBeNull();
    const lit = run([shown, { type: 'overlayEmphasis', emphasis: ['loved', 'world'] }]);
    expect(lit.overlay?.emphasis).toEqual(['loved', 'world']);
    const cleared = run([{ type: 'overlayEmphasis', emphasis: [] }], ctx(), lit);
    expect(cleared.overlay?.emphasis).toBeUndefined();
  });

  it('studies a word of the passage on screen, and puts it away with the passage', () => {
    const shown: LiveAction = {
      type: 'showOverlay',
      overlay: { ref: 'PSA.119.105', translation: 'BSB', mode: 'fullScreen' },
    };
    const word = { strong: 5216, verse: 'PSA.119.105', text: 'lamp' };
    // Nothing on screen: nothing to study.
    expect(run([{ type: 'showWord', word }]).word).toBeUndefined();
    const studied = run([shown, { type: 'showWord', word }]);
    expect(studied.word).toEqual(word);
    expect(run([{ type: 'hideWord' }], ctx(), studied).word).toBeNull();
    expect(run([{ type: 'overlayMode', mode: 'popup' }], ctx(), studied).word).toEqual(word);
    expect(run([shown], ctx(), studied).word).toBeNull();
    expect(run([{ type: 'clearOverlay' }], ctx(), studied)).toMatchObject({
      overlay: null,
      word: null,
    });
  });
});
