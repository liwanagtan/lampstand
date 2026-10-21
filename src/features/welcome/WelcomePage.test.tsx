import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { useSettings } from '@/features/settings/settingsStore';
import { ALL_FEATURES } from '@/app/features';

it('selects the salvation plan by default for someone new to following Jesus', async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  try {
    const user = userEvent.setup();
    const router = createMemoryRouter(
      [{ path: '/welcome', element: <WelcomePage /> }],
      { initialEntries: ['/welcome'] },
    );
    render(<RouterProvider router={router} />);
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Grow daily'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('checkbox', { name: /I’m new to following Jesus/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('radio', { name: /The good news: trusting Jesus/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Just the verse of the day/ })).not.toBeChecked();
  } finally {
    vi.unstubAllGlobals();
  }
});

it('keeps selected choices and allows a daily-verse start without a plan', async () => {
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
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Teach and present'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: /I’m new to following Jesus/ }));
    await user.click(screen.getByRole('checkbox', { name: /I’m returning to faith/ }));
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /I’m returning to faith/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('radio', { name: /Just the verse of the day/ }));
    await user.click(screen.getByRole('button', { name: 'Complete setup' }));
    expect(
      await screen.findByRole('heading', { name: 'Today ready' }, { timeout: 7000 }),
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
}, 12000);
