import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { Moved } from './Moved';
import { AppShell } from './AppShell';
import { HomeRoute } from './HomeRoute';
import { PersonalLayout } from './PersonalLayout';
import { RouteError } from './RouteError';
import { paths } from './paths';
import { LibraryPage } from '@/features/library/LibraryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

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
            path: 'bible',
            lazy: lazyPage(() => import('@/features/bible-app/BiblePresenter'), 'BiblePage'),
          },
          {
            path: 'plans',
            lazy: lazyPage(() => import('@/features/bible-app/PlansPage'), 'PlansPage'),
          },
          {
            path: 'plans/:planId/:day',
            lazy: lazyPage(() => import('@/features/bible-app/PlanReaderPage'), 'PlanReaderPage'),
          },
          {
            path: 'journal',
            lazy: lazyPage(() => import('@/features/bible-app/JournalPage'), 'JournalPage'),
          },
          {
            path: 'journal/notes',
            lazy: lazyPage(() => import('@/features/bible-app/NotesPage'), 'NotesPage'),
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
      { path: 'me', element: <SettingsPage /> },
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
      { path: 'bible/journal', element: <Navigate to={paths.journal} replace /> },
      { path: 'bible/notes', element: <Navigate to={paths.notes} replace /> },
      { path: 'import', element: <Navigate to={paths.screenImport} replace /> },
      { path: 'settings', element: <Navigate to={paths.me} replace /> },
      { path: 'edit/:id', element: <Moved to={(p) => paths.edit(p.id!)} /> },
    ],
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
