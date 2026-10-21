import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Moved } from './Moved';
import { AppShell } from './AppShell';
import { HomeRoute } from './HomeRoute';
import { PersonalLayout } from './PersonalLayout';
import { RouteError } from './RouteError';
import { paths } from './paths';
import { LibraryPage } from '@/features/library/LibraryPage';

const lazyPage = (load: () => Promise<Record<string, unknown>>, name: string) => async () => ({
  Component: (await load())[name] as React.ComponentType,
});

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      {
        // The personal side shares one TV session, so Show on screen works from any of it.
        element: <PersonalLayout />,
        children: [
          { index: true, element: <HomeRoute /> },
          {
            path: 'devotional/:date/:half',
            lazy: lazyPage(
              () => import('@/features/bible-app/ClassicDevotionalPage'),
              'ClassicDevotionalPage',
            ),
          },
          {
            path: 'bible',
            lazy: lazyPage(() => import('@/features/bible-app/BibleReaderPage'), 'BibleReaderPage'),
          },
          {
            path: 'plans',
            lazy: lazyPage(() => import('@/features/bible-app/PlansPage'), 'PlansPage'),
          },
          {
            path: 'plans/c/:categoryId',
            lazy: lazyPage(
              () => import('@/features/bible-app/PlanBrowsePages'),
              'PlanCategoryPage',
            ),
          },
          {
            path: 'plans/p/:planId',
            lazy: lazyPage(() => import('@/features/bible-app/PlanBrowsePages'), 'PlanPage'),
          },
          {
            path: 'plans/:planId/:day',
            lazy: lazyPage(() => import('@/features/bible-app/PlanReaderPage'), 'PlanReaderPage'),
          },
          {
            path: 'search',
            lazy: lazyPage(() => import('@/features/search/SearchPage'), 'SearchPage'),
          },
          {
            path: 'profile',
            lazy: lazyPage(() => import('@/features/profile/ProfileLayout'), 'ProfileLayout'),
            children: [
              {
                index: true,
                lazy: lazyPage(() => import('@/features/profile/JourneyPage'), 'JourneyPage'),
              },
              {
                path: 'you',
                lazy: lazyPage(() => import('@/features/profile/ProfileTab'), 'ProfileTab'),
              },
              {
                path: 'settings',
                lazy: lazyPage(() => import('@/features/settings/SettingsPage'), 'SettingsPage'),
              },
            ],
          },
        ],
      },
      { path: 'screen', element: <LibraryPage /> },
      {
        path: 'screen/import',
        lazy: lazyPage(() => import('@/features/library/ImportPage'), 'ImportPage'),
      },
      {
        path: 'screen/edit/:id',
        lazy: lazyPage(() => import('@/features/editor/EditorPage'), 'EditorPage'),
      },
      {
        path: 'dev/slides',
        lazy: lazyPage(() => import('@/features/dev/SlidesPage'), 'SlidesPage'),
      },
      {
        path: 'dev/components',
        lazy: lazyPage(() => import('@/features/dev/ComponentsPage'), 'ComponentsPage'),
      },
      // Old links (before the Grow-first structure) keep working.
      { path: 'bible/today', element: <Navigate to={paths.today} replace /> },
      { path: 'bible/plans', element: <Navigate to={paths.plans} replace /> },
      {
        path: 'bible/plans/:planId/:day',
        element: <Moved to={(p) => paths.planDay(p.planId!, Number(p.day))} />,
      },
      { path: 'bible/journal', element: <Navigate to={paths.profile} replace /> },
      { path: 'bible/notes', element: <Navigate to={paths.profile} replace /> },
      { path: 'journal', element: <Navigate to={paths.profile} replace /> },
      { path: 'journal/notes', element: <Navigate to={paths.profile} replace /> },
      { path: 'me', element: <Navigate to={paths.profileYou} replace /> },
      { path: 'import', element: <Navigate to={paths.screenImport} replace /> },
      { path: 'settings', element: <Navigate to={paths.settings} replace /> },
      { path: 'edit/:id', element: <Moved to={(p) => paths.edit(p.id!)} /> },
    ],
  },
  {
    path: '/welcome',
    errorElement: <RouteError />,
    lazy: lazyPage(() => import('@/features/welcome/WelcomePage'), 'WelcomePage'),
  },
  {
    path: '/screen/bible',
    errorElement: <RouteError />,
    lazy: lazyPage(() => import('@/features/bible-console/BibleConsolePage'), 'BibleConsolePage'),
  },
  {
    path: '/screen/:id',
    errorElement: <RouteError />,
    lazy: lazyPage(() => import('@/features/present/PresentPage'), 'PresentPage'),
  },
  { path: '/present/:id', element: <Moved to={(p) => paths.presentation(p.id!)} /> },
  {
    path: '/output',
    lazy: lazyPage(() => import('@/features/output/OutputPage'), 'OutputPage'),
  },
];

export const router = createBrowserRouter(routes);
