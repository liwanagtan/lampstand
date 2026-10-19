// Feature switches (docs/PRD-ADDENDUM-GROW.md, Onboarding and Profile). The Bible reader is always on.
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarCheck, MonitorPlay, Search, Sunrise, UserRound } from 'lucide-react';
import { paths } from './paths';
import type { NavGlyph } from './NavIcon';

export type FeatureKey = 'today' | 'plans' | 'journal' | 'marks' | 'screen';
export type Features = Record<FeatureKey, boolean>;

export const ALL_FEATURES: Features = {
  today: true,
  plans: true,
  journal: true,
  marks: true,
  screen: true,
};

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** The animated nav icon (design system › Lottie); absent for Profile, which shows the avatar. */
  glyph?: NavGlyph;
  /** The switch that shows this destination; absent = always shown. */
  feature?: FeatureKey;
  end?: boolean;
}

/** Fixed order: hiding a destination never moves the others. */
export const NAV: readonly NavItem[] = [
  { to: paths.today, label: 'Today', icon: Sunrise, glyph: 'today', feature: 'today', end: true },
  { to: paths.bible, label: 'Bible', icon: BookOpen, glyph: 'bible' },
  { to: paths.plans, label: 'Plans', icon: CalendarCheck, glyph: 'plans', feature: 'plans' },
  { to: paths.screen, label: 'Screen', icon: MonitorPlay, glyph: 'screen', feature: 'screen' },
];

export function visibleNav(features: Features): NavItem[] {
  return NAV.filter((n) => !n.feature || features[n.feature]);
}

const SEARCH: NavItem = { to: paths.search, label: 'Search', icon: Search, glyph: 'search' };
const PROFILE: NavItem = { to: paths.profile, label: 'Profile', icon: UserRound };

/**
 * The phone tab bar: the reading places, Search and Profile. Screen waits in Profile, since
 * presenting happens from a laptop — except for someone who only presents, who keeps it.
 */
export function phoneTabs(features: Features): NavItem[] {
  const screen = NAV.find((n) => n.to === paths.screen)!;
  const reading = visibleNav(features).filter((n) => n !== screen);
  const presentingOnly = homePath(features) === paths.screen;
  return [...reading, presentingOnly ? screen : SEARCH, PROFILE];
}

/**
 * Where the app opens: Today when it's on; Screen for someone who only presents; otherwise
 * the Bible (always on).
 */
export function homePath(features: Features): string {
  if (features.today) return paths.today;
  if (features.screen && !features.marks && !features.plans && !features.journal)
    return paths.screen;
  return paths.bible;
}

// ---- Use cases (onboarding and Profile › What I use Lampstand for) ----

export type UseCaseId = 'grow' | 'study' | 'teach';

export interface UseCase {
  id: UseCaseId;
  title: string;
  description: string;
  turnsOn: string;
  parts: FeatureKey[];
}

/** Titles name what the person wants to do; each says what it turns on. */
export const USE_CASES: readonly UseCase[] = [
  {
    id: 'grow',
    title: 'Grow daily',
    description:
      'A verse to start each day, reading plans that fit your pace, and a private journal for what God is teaching you.',
    turnsOn: 'Turns on Today, Plans and the journal in Journey.',
    parts: ['today', 'plans', 'journal'],
  },
  {
    id: 'study',
    title: 'Read and study',
    description:
      'The Bible with nothing in the way: search, compare translations side by side, and highlight, bookmark and take notes as you read.',
    turnsOn: 'Turns on the Bible reader, highlights and notes.',
    parts: ['marks'],
  },
  {
    id: 'teach',
    title: 'Teach and present',
    description:
      'Put Scripture and sermon slides on a TV or projector for a service, a class or a small group, from your laptop.',
    turnsOn: 'Turns on Screen.',
    parts: ['screen'],
  },
];

export const PART_LABELS: Record<FeatureKey, string> = {
  today: 'Today',
  plans: 'Plans',
  journal: 'Journal and reflections',
  marks: 'Highlights, bookmarks and notes',
  screen: 'Screen',
};

/** The switches for a set of chosen use cases. The Bible reader is always on. */
export function featuresFor(uses: Iterable<UseCaseId>): Features {
  const chosen = new Set(uses);
  const f: Features = { today: false, plans: false, journal: false, marks: false, screen: false };
  for (const u of USE_CASES) if (chosen.has(u.id)) for (const p of u.parts) f[p] = true;
  return f;
}

/** Whether a use case is on, off, or customised to some of its parts. */
export function useCaseState(features: Features, u: UseCase): 'on' | 'off' | 'some' {
  const on = u.parts.filter((p) => features[p]).length;
  return on === 0 ? 'off' : on === u.parts.length ? 'on' : 'some';
}
