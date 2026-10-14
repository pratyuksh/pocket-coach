import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../features/auth/LoginForm';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form with email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText(/ask a super-admin for an invite/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // Google sign-in is left out for now (it needs the server-side invites of 1.6a).
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    // No reset flow exists yet (known issue F3), so the design's "Forgot password?" is left out.
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
  });

  it('populates credentials when demo account buttons are clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm />);

    const superAdminBtn = screen.getByRole('button', { name: /super admin/i });
    await user.click(superAdminBtn);

    expect(screen.getByLabelText('Email')).toHaveValue('admin@club.de');
    expect(screen.getByLabelText('Password')).toHaveValue('Password123!');
  });

  it('submits login form and navigates to dashboard on success', async () => {
    const user = userEvent.setup({ delay: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'trainer1@club.de');
    await user.type(passInput, 'Password123!');

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'trainer1@club.de',
        password: 'Password123!',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message when login fails', async () => {
    const user = userEvent.setup({ delay: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'wrong@club.de');
    await user.type(passInput, 'WrongPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials');
    });
  });

  it('shows a translated message for wrong credentials, in both languages', async () => {
    const user = userEvent.setup({ delay: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: null,
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    });

    render(<LoginForm />);
    await user.type(screen.getByLabelText('Email'), 'a@club.de');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');

    await act(() => i18n.changeLanguage('de'));
    expect(screen.getByRole('heading', { name: 'Anmelden' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-Mail oder Passwort ist falsch.');
  });
});
