// Feature switches (docs/PRD-ADDENDUM-GROW.md, Onboarding and Me). The Bible reader is always on.
import type { LucideIcon } from 'lucide-react';
import { BookOpen, CalendarCheck, MonitorPlay, NotebookPen, Sunrise } from 'lucide-react';
import { paths } from './paths';

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
  /** The switch that shows this destination; absent = always shown. */
  feature?: FeatureKey;
  end?: boolean;
}

/** Fixed order: hiding a destination never moves the others. */
export const NAV: readonly NavItem[] = [
  { to: paths.today, label: 'Today', icon: Sunrise, feature: 'today', end: true },
  { to: paths.bible, label: 'Bible', icon: BookOpen },
  { to: paths.plans, label: 'Plans', icon: CalendarCheck, feature: 'plans' },
  { to: paths.journal, label: 'Journal', icon: NotebookPen, feature: 'journal' },
  { to: paths.screen, label: 'Screen', icon: MonitorPlay, feature: 'screen' },
];

export function visibleNav(features: Features): NavItem[] {
  return NAV.filter((n) => !n.feature || features[n.feature]);
}

/** Where the app opens: the first destination still showing. */
export function homePath(features: Features): string {
  return visibleNav(features)[0]!.to;
}
