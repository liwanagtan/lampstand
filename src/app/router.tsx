import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './AppShell';
import { RouteError } from './RouteError';
import { LibraryPage } from '@/features/library/LibraryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      {
        path: 'import',
        lazy: async () => ({
          Component: (await import('@/features/library/ImportPage')).ImportPage,
        }),
      },
      {
        path: 'edit/:id',
        lazy: async () => ({
          Component: (await import('@/features/editor/EditorPage')).EditorPage,
        }),
      },
      {
        path: 'dev/slides',
        lazy: async () => ({ Component: (await import('@/features/dev/SlidesPage')).SlidesPage }),
      },
      {
        path: 'dev/components',
        lazy: async () => ({
          Component: (await import('@/features/dev/ComponentsPage')).ComponentsPage,
        }),
      },
    ],
  },
  {
    path: '/present/:id',
    errorElement: <RouteError />,
    lazy: async () => ({ Component: (await import('@/features/present/PresentPage')).PresentPage }),
  },
  {
    path: '/output',
    lazy: async () => ({ Component: (await import('@/features/output/OutputPage')).OutputPage }),
  },
];

export const router = createBrowserRouter(routes);
