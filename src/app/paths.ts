// Every route in one place (docs/PRD-ADDENDUM-GROW.md, Information architecture).

export const paths = {
  today: '/',
  bible: '/bible',
  plans: '/plans',
  planDay: (planId: string, day: number) => `/plans/${planId}/${day}`,
  planPage: (planId: string) => `/plans/p/${planId}`,
  planCategory: (categoryId: string) => `/plans/c/${categoryId}`,
  journal: '/journal',
  screen: '/screen',
  screenImport: '/screen/import',
  screenBible: '/screen/bible',
  presentation: (id: string) => `/screen/${id}`,
  edit: (id: string) => `/screen/edit/${id}`,
  me: '/me',
} as const;

/** Routes where the TV may be live: updates and tips must not interrupt them. */
export function isPresentingPath(pathname: string): boolean {
  return /^\/screen\/(?!import$|edit\/)[^/]+$/.test(pathname) || pathname.startsWith('/output');
}
