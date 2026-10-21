import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { useSettings } from '@/features/settings/settingsStore';
import { ALL_FEATURES } from '@/app/features';

it('finishes later with the answers already given instead of enabling every feature', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const before = useSettings.getState();
  try {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [
        { path: '/welcome', element: <WelcomePage /> },
        { path: '/', element: <h1>Today ready</h1> },
      ],
      { initialEntries: ['/welcome'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByRole('button', { name: 'Finish setup later' })).toBeDisabled();
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Teach and present'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('button', { name: 'Skip this question' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: /I’m new to following Jesus/ }));
    await user.click(screen.getByRole('checkbox', { name: /I’m returning to faith/ }));
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /I’m returning to faith/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Finish setup later' }));
    expect(
      await screen.findByRole('heading', { name: 'Today ready' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(useSettings.getState().profile).toMatchObject({
      name: 'Grace',
      faithJourney: ['new', 'returning'],
    });
    expect(useSettings.getState().features).toEqual({
      today: true,
      plans: false,
      marks: false,
      journal: false,
      screen: true,
    });
    expect(useSettings.getState().features).not.toEqual(ALL_FEATURES);
  } finally {
    useSettings.setState(before);
    localStorage.removeItem('lampstand.onboarded');
    vi.unstubAllGlobals();
  }
}, 10000);
