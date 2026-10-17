import { ALL_FEATURES, homePath, visibleNav } from './features';
import { isPresentingPath } from './paths';

describe('feature switches', () => {
  it('shows every destination in a fixed order', () => {
    expect(visibleNav(ALL_FEATURES).map((n) => n.label)).toEqual([
      'Today',
      'Bible',
      'Plans',
      'Screen',
    ]);
  });

  it('hides switched-off destinations without reordering the rest', () => {
    const f = { ...ALL_FEATURES, today: false, plans: false };
    expect(visibleNav(f).map((n) => n.label)).toEqual(['Bible', 'Screen']);
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

describe('use cases', () => {
  it('turns on exactly the ticked use cases', async () => {
    const { featuresFor, USE_CASES, useCaseState } = await import('./features');
    expect(featuresFor(['teach'])).toEqual({
      today: false,
      plans: false,
      journal: false,
      marks: false,
      screen: true,
    });
    const grow = featuresFor(['grow']);
    expect(homePath(grow)).toBe('/');
    expect(homePath(featuresFor(['teach']))).toBe('/screen');
    expect(homePath(featuresFor(['study', 'teach']))).toBe('/bible');
    expect(visibleNav(featuresFor(['teach'])).map((n) => n.label)).toEqual(['Bible', 'Screen']);
    expect(useCaseState({ ...grow, plans: false }, USE_CASES[0]!)).toBe('some');
  });
});

describe('phone tab bar', () => {
  it('is Today, Bible, Plans, Search and Profile; Screen waits in Profile', async () => {
    const { phoneTabs } = await import('./features');
    expect(phoneTabs(ALL_FEATURES).map((n) => n.label)).toEqual([
      'Today',
      'Bible',
      'Plans',
      'Search',
      'Profile',
    ]);
  });

  it('keeps Screen for someone who only presents', async () => {
    const { phoneTabs } = await import('./features');
    const f = { today: false, plans: false, journal: false, marks: false, screen: true };
    expect(phoneTabs(f).map((n) => n.label)).toEqual(['Bible', 'Screen', 'Profile']);
  });
});
