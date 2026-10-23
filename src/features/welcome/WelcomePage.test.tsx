import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { useSettings } from '@/features/settings/settingsStore';
import { ALL_FEATURES } from '@/app/features';

const phoneless = () =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

function renderWelcome() {
  const router = createMemoryRouter(
    [
      { path: '/welcome', element: <WelcomePage /> },
      { path: '/', element: <h1>Today ready</h1> },
    ],
    { initialEntries: ['/welcome'] },
  );
  render(<RouterProvider router={router} />);
}

it('starts someone new to faith with the salvation reading instead of a plan', async () => {
  phoneless();
  const before = useSettings.getState();
  try {
    const user = userEvent.setup();
    renderWelcome();
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Grow daily'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const first = screen.getByRole('radio', { name: /Taking my first steps/ });
    expect(first).toHaveTextContent('The good news, one step at a time');
    expect(screen.getByRole('button', { name: 'Let’s begin' })).toBeDisabled();
    await user.click(first);
    await user.click(screen.getByRole('button', { name: 'Let’s begin' }));
    expect(
      await screen.findByRole('heading', { name: 'Today ready' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(useSettings.getState().profile).toMatchObject({ name: 'Grace', faithJourney: ['new'] });
    expect(useSettings.getState().features.plans).toBe(true);
  } finally {
    useSettings.setState(before);
    localStorage.removeItem('lampstand.onboarded');
    vi.unstubAllGlobals();
  }
}, 12000);

it('asks only two questions of someone who comes to teach', async () => {
  phoneless();
  const before = useSettings.getState();
  try {
    const user = userEvent.setup();
    renderWelcome();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByText('Teach and present'));
    // Without daily growth there is no plan to choose, so this is the last step.
    await user.click(screen.getByRole('button', { name: 'Let’s begin' }));
    expect(
      await screen.findByRole('heading', { name: 'Today ready' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(useSettings.getState().profile).toMatchObject({ name: 'Grace', faithJourney: [] });
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
