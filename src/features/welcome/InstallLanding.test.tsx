import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallLanding } from './InstallLanding';

it('lets a visitor learn how to install without starting browser setup', async () => {
  const onContinue = vi.fn();
  const user = userEvent.setup();
  render(<InstallLanding onContinue={onContinue} />);

  expect(screen.getByRole('heading', { name: 'Grow in faith, one day at a time.' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Install Lampstand' }));
  expect(screen.getByText('Try installation on the published app')).toBeVisible();
  expect(onContinue).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Continue in browser' }));
  expect(onContinue).toHaveBeenCalledOnce();
});
