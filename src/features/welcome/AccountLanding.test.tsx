import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountLanding } from './AccountLanding';

it('offers guest setup while Google sign-in is configured', async () => {
  const onContinueGuest = vi.fn();
  render(<AccountLanding onContinueGuest={onContinueGuest} />);

  expect(screen.getByRole('heading', { name: 'Your faith journey, saved.' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Continue without an account' }));
  expect(onContinueGuest).toHaveBeenCalledOnce();
});
