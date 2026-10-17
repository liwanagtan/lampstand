import { ALL_FEATURES, homePath, visibleNav } from './features';
import { isPresentingPath } from './paths';

describe('feature switches', () => {
  it('shows every destination in a fixed order', () => {
    expect(visibleNav(ALL_FEATURES).map((n) => n.label)).toEqual([
      'Today',
      'Bible',
      'Plans',
      'Journal',
      'Screen',
    ]);
  });

  it('hides switched-off destinations without reordering the rest', () => {
    const f = { ...ALL_FEATURES, today: false, plans: false };
    expect(visibleNav(f).map((n) => n.label)).toEqual(['Bible', 'Journal', 'Screen']);
    expect(homePath(f)).toBe('/bible');
  });

  it('always keeps the Bible', () => {
    const none = { today: false, plans: false, journal: false, marks: false, screen: false };
    expect(visibleNav(none).map((n) => n.label)).toEqual(['Bible']);
    expect(homePath(ALL_FEATURES)).toBe('/');
  });
});

describe('presenting paths', () => {
  it('matches consoles and the output only', () => {
    expect(isPresentingPath('/screen/abc123')).toBe(true);
    expect(isPresentingPath('/screen/bible')).toBe(true);
    expect(isPresentingPath('/output')).toBe(true);
    expect(isPresentingPath('/screen')).toBe(false);
    expect(isPresentingPath('/screen/import')).toBe(false);
    expect(isPresentingPath('/screen/edit/abc')).toBe(false);
  });
});
