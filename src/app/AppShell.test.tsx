import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';
import { ALL_FEATURES } from './features';
import { useSettings } from '@/features/settings/settingsStore';
import { db } from '@/db/db';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

describe('AppShell', () => {
  afterEach(() => useSettings.setState({ features: ALL_FEATURES }));

  it('shows the five destinations and Me', async () => {
    renderAt('/screen');
    expect(await screen.findByRole('heading', { name: 'Screen', level: 1 })).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Today', 'Bible', 'Plans', 'Journal', 'Screen']);
    expect(screen.getByRole('link', { name: /Me: profile and settings/ })).toBeInTheDocument();
  });

  it('hides switched-off destinations', async () => {
    useSettings.setState({ features: { ...ALL_FEATURES, plans: false, screen: false } });
    renderAt('/me');
    await screen.findByRole('heading', { name: 'Me', level: 1 });
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Today', 'Bible', 'Journal']);
  });

  it('sends old links to their new homes', async () => {
    const router = renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Me', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/me');
  });

  it('switches and persists the app appearance from Me', async () => {
    renderAt('/me');
    await userEvent.click(await screen.findByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(useSettings.getState().uiMode).toBe('light');
    expect((await db.settings.get('uiMode'))?.value).toBe('light');
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
