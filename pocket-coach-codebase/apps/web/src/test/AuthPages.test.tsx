import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { InvitePage, LoginPage } from '../pages/Auth';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

const update = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      update: (payload: unknown) => ({ eq: (...args: unknown[]) => update(payload, ...args) }),
      upsert,
    })),
  },
}));

const renderInvite = (email = 'new@club.de') => {
  const router = createMemoryRouter(
    [
      { path: '/invite/:token', element: <InvitePage /> },
      { path: '/dashboard', element: <p>dashboard</p> },
    ],
    { initialEntries: [`/invite/${btoa(email)}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

describe('LoginPage', () => {
  it('shows the language switch, the benefits and the privacy line', async () => {
    const router = createMemoryRouter([{ path: '/login', element: <LoginPage /> }], {
      initialEntries: ['/login'],
    });
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByText('Every session in one place')).toBeInTheDocument();
    expect(screen.getByText(/hosted in switzerland/i)).toBeInTheDocument();
    expect(screen.queryByText(/frankfurt/i)).not.toBeInTheDocument();
    // Availability surveys are Phase 2.1: the page must not promise them.
    expect(screen.queryByText(/availability/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'DE' }));
    expect(await screen.findByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
    expect(screen.getByText('Alle Trainings an einem Ort')).toBeInTheDocument();
    expect(screen.getByText(/gehostet in der schweiz/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Sprache' })).toBeInTheDocument();
  });
});

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ error: null });
    upsert.mockResolvedValue({ error: null });
  });

  it('prefills a read-only email from the link and has three fields', () => {
    renderInvite();
    expect(screen.getByLabelText('Email')).toHaveValue('new@club.de');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a password')).toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('rejects a short password without calling the server', async () => {
    renderInvite();
    await userEvent.type(screen.getByLabelText('Your name'), 'Elif');
    await userEvent.type(screen.getByLabelText('Choose a password'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 6 characters.',
    );
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('signs up a new account in the chosen language and goes to the dashboard', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as never);
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    } as never);

    const router = renderInvite();
    await userEvent.click(screen.getByRole('radio', { name: 'DE' }));
    await userEvent.type(await screen.findByLabelText('Dein Name'), 'Elif Yilmaz');
    await userEvent.type(screen.getByLabelText('Passwort wählen'), 'MySecret!42');
    await userEvent.click(screen.getByRole('button', { name: 'Konto erstellen' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@club.de',
      password: 'MySecret!42',
      options: { data: { display_name: 'Elif Yilmaz' } },
    });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ preferred_language: 'de' }));
    expect(i18n.resolvedLanguage).toBe('de');
  });

  it('takes over an invited account, saving name and language', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { id: 'u2' }, session: {} },
      error: null,
    } as never);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as never);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'u2' } },
      error: null,
    } as never);

    const router = renderInvite();
    await userEvent.type(screen.getByLabelText('Your name'), 'Elif');
    await userEvent.type(screen.getByLabelText('Choose a password'), 'MySecret!42');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'MySecret!42',
      data: { display_name: 'Elif' },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: 'Elif', preferred_language: 'en' }),
      'id',
      'u2',
    );
  });

  it('shows a translated message when the account already exists', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as never);
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_already_exists', message: 'User already registered' },
    } as never);

    renderInvite();
    await userEvent.type(screen.getByLabelText('Your name'), 'Elif');
    await userEvent.type(screen.getByLabelText('Choose a password'), 'MySecret!42');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in instead.',
    );
  });
});
