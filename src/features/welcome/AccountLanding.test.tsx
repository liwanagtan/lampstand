import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountLanding } from './AccountLanding';

it('has one clear way in, and sign-in for returning readers', async () => {
  const onContinueGuest = vi.fn();
  render(<AccountLanding onContinueGuest={onContinueGuest} />);

  expect(screen.getByRole('heading', { name: 'Grow in the Word, every day.' })).toBeVisible();
  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'I have an account' })).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Get started' }));
  expect(onContinueGuest).toHaveBeenCalledOnce();
});
