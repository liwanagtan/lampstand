import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from './router';
import { useSettings } from '@/features/settings/settingsStore';
import { db } from '@/db/db';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe('AppShell', () => {
  it('shows navigation and the library by default', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('switches and persists the app appearance', async () => {
    renderAt('/');
    await userEvent.click(await screen.findByRole('radio', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(useSettings.getState().uiMode).toBe('light');
    expect((await db.settings.get('uiMode'))?.value).toBe('light');
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
