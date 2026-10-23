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
  beforeEach(() => localStorage.setItem('lampstand.onboarded', '1'));
  afterEach(() => useSettings.setState({ features: ALL_FEATURES }));

  it('shows the destinations and Profile', async () => {
    renderAt('/screen');
    expect(await screen.findByRole('heading', { name: 'Screen', level: 1 })).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Today', 'Plans', 'Bible', 'Screen']);
    expect(screen.getByRole('link', { name: /Profile: your journey/ })).toBeInTheDocument();
  });

  it('hides switched-off destinations', async () => {
    useSettings.setState({ features: { ...ALL_FEATURES, plans: false, screen: false } });
    renderAt('/profile/settings');
    await screen.findByRole('radio', { name: 'Light' });
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Today', 'Bible']);
  });

  it('sends a first run to the welcome flow', async () => {
    localStorage.removeItem('lampstand.onboarded');
    const router = renderAt('/');
    expect(
      await screen.findByRole('heading', { name: 'What should we call you?' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/welcome');
  });

  it('sends old links to their new homes', async () => {
    const router = renderAt('/settings');
    expect(
      await screen.findByRole('radio', { name: 'Light' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/profile/settings');
    router.navigate('/me');
    expect(await screen.findByLabelText('Your name', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/profile/you');
    router.navigate('/journal');
    expect(
      await screen.findByRole('heading', { name: 'Your journey starts here' }, { timeout: 5000 }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/profile');
  });

  it('keeps light appearance and disables Dark/System from Profile › Settings', async () => {
    renderAt('/profile/settings');
    await userEvent.click(await screen.findByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(useSettings.getState().uiMode).toBe('light');
    expect((await db.settings.get('uiMode'))?.value).toBe('light');
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'System' })).toBeDisabled();
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
