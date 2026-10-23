import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { ReflectionMoment } from './ReflectionMoment';

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await db.entries.clear();
});

it('lets readers pray, return, or finish without writing an entry', async () => {
  const user = userEvent.setup();
  const finish = vi.fn();
  const back = vi.fn();
  render(
    <MemoryRouter>
      <ReflectionMoment
        question="What stands out to you?"
        reference="JHN.1.1"
        title="John 1"
        saved={null}
        onFinish={finish}
        onReturn={back}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText('What stands out to you?')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Pray' }));
  expect(screen.getByText('Take a moment to speak to God about what you read.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Back to the passage' }));
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(back).toHaveBeenCalledOnce();
  expect(finish).toHaveBeenCalledOnce();
  expect(await db.entries.count()).toBe(0);
});
