import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { query, routeFrom } from './fixtures/supabaseMock';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}));

const profile = { id: 'u-1', display_name: 'Max Trainer', email: 'max@club.de' };
const authedSession = { user: { id: 'u-1', email: 'max@club.de' } };

function Probe() {
  const { user, profile, roles, loading, signOut, refreshProfile } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.id ?? 'none'}</span>
      <span data-testid="name">{profile?.display_name ?? 'none'}</span>
      <span data-testid="roles">{roles.join(',') || 'none'}</span>
      <button onClick={() => signOut()}>sign out</button>
      <button onClick={() => refreshProfile()}>refresh</button>
    </div>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider / useAuth', () => {
  let authListener: (event: string, session: unknown) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChange.mockImplementation((cb) => {
      authListener = cb;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.from.mockImplementation(
      routeFrom({
        profiles: query({ data: profile }),
        user_roles: query({ data: [{ role: 'trainer' }, { role: 'head_trainer' }] }),
      }),
    );
  });

  it('finishes loading with no user when there is no session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('roles')).toHaveTextContent('none');
  });

  it('is loading until the session check completes', () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    renderAuth();
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('loads the profile and roles of an existing session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: authedSession } });
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('u-1');
    expect(screen.getByTestId('name')).toHaveTextContent('Max Trainer');
    expect(screen.getByTestId('roles')).toHaveTextContent('trainer,head_trainer');
  });

  it('keeps the user signed in but without roles when the profile and roles cannot be read', async () => {
    mocks.from.mockImplementation(
      routeFrom({
        profiles: query({ error: { message: 'no row' } }),
        user_roles: query({ error: { message: 'denied' } }),
      }),
    );
    mocks.getSession.mockResolvedValue({ data: { session: authedSession } });
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('u-1');
    expect(screen.getByTestId('name')).toHaveTextContent('none');
    expect(screen.getByTestId('roles')).toHaveTextContent('none');
  });

  it('picks up a sign-in and a sign-out announced by the auth listener', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await act(async () => {
      await authListener('SIGNED_IN', authedSession);
    });
    expect(screen.getByTestId('user')).toHaveTextContent('u-1');
    expect(screen.getByTestId('roles')).toHaveTextContent('trainer,head_trainer');

    await act(async () => {
      await authListener('SIGNED_OUT', null);
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('name')).toHaveTextContent('none');
    expect(screen.getByTestId('roles')).toHaveTextContent('none');
  });

  it('signs out through Supabase and clears the user, profile and roles', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getSession.mockResolvedValue({ data: { session: authedSession } });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('roles')).toHaveTextContent('trainer'));

    await user.click(screen.getByRole('button', { name: 'sign out' }));

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(screen.getByTestId('roles')).toHaveTextContent('none');
  });

  it('refreshProfile reloads the signed-in user', async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getSession.mockResolvedValue({ data: { session: authedSession } });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Max Trainer'));
    const before = mocks.from.mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => expect(mocks.from.mock.calls.length).toBeGreaterThan(before));
  });

  it('stops listening to auth changes when unmounted', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = renderAuth();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
});
