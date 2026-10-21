// Every route in one place (docs/PRD-ADDENDUM-GROW.md, Information architecture).

export const paths = {
  today: '/',
  devotional: (date: string, half: 'morning' | 'evening') => `/devotional/${date}/${half}`,
  bible: '/bible',
  plans: '/plans',
  planDay: (planId: string, day: number) => `/plans/${planId}/${day}`,
  planPage: (planId: string) => `/plans/p/${planId}`,
  planCategory: (categoryId: string) => `/plans/c/${categoryId}`,
  screen: '/screen',
  screenImport: '/screen/import',
  screenBible: '/screen/bible',
  presentation: (id: string) => `/screen/${id}`,
  edit: (id: string) => `/screen/edit/${id}`,
  /** Profile opens on Journey: your reading, reflections and marks. */
  profile: '/profile',
  profileYou: '/profile/you',
  settings: '/profile/settings',
  search: '/search',
} as const;

/** Routes where the TV may be live: updates and tips must not interrupt them. */
export function isPresentingPath(pathname: string): boolean {
  return /^\/screen\/(?!import$|edit\/)[^/]+$/.test(pathname) || pathname.startsWith('/output');
}
