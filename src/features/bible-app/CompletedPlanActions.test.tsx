import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { db } from '@/db/db';
import { builtinPlans } from './plans';
import { CompletedPlanActions } from './CompletedPlanActions';

const plan = builtinPlans().find((p) => p.id === 'gospels-40')!;
const original = {
  planId: plan.id,
  startedAt: 100,
  updatedAt: 200,
  done: plan.days.map((_, i) => i + 1),
  doneAt: { 1: 150 },
};
function setup() {
  const router = createMemoryRouter([
    { path: '/', element: <CompletedPlanActions plan={plan} /> },
    { path: '/plans/:id/:day', element: <h1>Reading</h1> },
  ]);
  render(<RouterProvider router={router} />);
  return router;
}
beforeEach(async () => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  await db.plans.put(original);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await db.plans.clear();
});

it('revisits the readings without resetting completion', async () => {
  const user = userEvent.setup();
  const router = setup();
  await user.click(screen.getByRole('button', { name: 'Revisit readings' }));
  expect(router.state.location.pathname).toBe('/plans/gospels-40/1');
  expect(await db.plans.get(plan.id)).toEqual(original);
});
it('keeps completion when restart is cancelled', async () => {
  const user = userEvent.setup();
  setup();
  await user.click(screen.getByRole('button', { name: /^Start again$/ }));
  expect(screen.getByRole('dialog')).toHaveTextContent('resets this plan’s reading progress');
  await user.click(screen.getByRole('button', { name: 'Keep completion' }));
  expect(await db.plans.get(plan.id)).toEqual(original);
});
it('only resets progress after explicit confirmation', async () => {
  const user = userEvent.setup();
  const router = setup();
  await user.click(screen.getByRole('button', { name: /^Start again$/ }));
  expect(await db.plans.get(plan.id)).toEqual(original);
  await user.click(screen.getByRole('button', { name: 'Reset and start again' }));
  expect(await screen.findByRole('heading', { name: 'Reading' })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/plans/gospels-40/1');
  expect((await db.plans.get(plan.id))?.done).toEqual([]);
});
