import { AuthRetryableFetchError, type Session, type User } from '@supabase/supabase-js';

type Listener = (event: string, session: Session | null) => void;
const auth = vi.hoisted(() => ({
  listener: null as ((event: string, session: unknown) => void) | null,
  getSession: vi.fn(),
}));

vi.mock('./client', () => ({
  accountsConfigured: true,
  accountClient: {
    auth: {
      getSession: auth.getSession,
      onAuthStateChange: (fn: Listener) => {
        auth.listener = fn as typeof auth.listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  },
}));
vi.mock('./reload', () => ({ reloadApp: vi.fn() }));

const { markProfileOpened, useAccount } = await import('./accountStore');
const { reloadApp } = await import('./reload');

const user = (id: string) => ({ id, email: `${id}@example.com` }) as User;
const session = (id: string) => ({ user: user(id) }) as Session;
const offline = () => new AuthRetryableFetchError('Failed to fetch', 0);

beforeEach(() => {
  localStorage.clear();
  vi.mocked(reloadApp).mockClear();
  markProfileOpened(undefined as unknown as null);
  useAccount.setState({ status: 'loading', user: null, offline: false, error: null });
});

it('opens the last account offline when the session cannot be refreshed', async () => {
  auth.getSession.mockResolvedValueOnce({ data: { session: session('ana') }, error: null });
  await useAccount.getState().init();

  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: offline() });
  await useAccount.getState().init();
  expect(useAccount.getState()).toMatchObject({ status: 'signed-in', offline: true });
  expect(useAccount.getState().user?.id).toBe('ana');
});

it('opens the guest profile when the session is really gone', async () => {
  auth.getSession.mockResolvedValueOnce({ data: { session: session('ana') }, error: null });
  await useAccount.getState().init();

  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  await useAccount.getState().init();
  expect(useAccount.getState()).toMatchObject({ status: 'guest', user: null, offline: false });

  // Nothing is remembered any more, so even an offline start stays guest.
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: offline() });
  await useAccount.getState().init();
  expect(useAccount.getState().status).toBe('guest');
});

it('reloads when a different account signs in or the account signs out elsewhere', async () => {
  auth.getSession.mockResolvedValueOnce({ data: { session: session('ana') }, error: null });
  await useAccount.getState().init();
  markProfileOpened('ana');

  auth.listener!('TOKEN_REFRESHED', session('ana'));
  auth.listener!('INITIAL_SESSION', null);
  expect(reloadApp).not.toHaveBeenCalled();

  auth.listener!('SIGNED_IN', session('ben'));
  expect(reloadApp).toHaveBeenCalledTimes(1);
  auth.listener!('SIGNED_OUT', null);
  expect(reloadApp).toHaveBeenCalledTimes(2);
});

it('reloads a guest page when someone signs in from another tab', async () => {
  auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  await useAccount.getState().init();
  markProfileOpened(null);

  auth.listener!('SIGNED_OUT', null);
  expect(reloadApp).not.toHaveBeenCalled();
  auth.listener!('SIGNED_IN', session('ana'));
  expect(reloadApp).toHaveBeenCalledTimes(1);
});
