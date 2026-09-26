import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../features/auth/LoginForm';
import { supabase } from '../lib/supabase';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form with email and password inputs', () => {
    render(<LoginForm />);

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('populates credentials when demo account buttons are clicked', async () => {
    const user = userEvent.setup({ delay: null });
    render(<LoginForm />);

    const superAdminBtn = screen.getByRole('button', { name: /super admin/i });
    await user.click(superAdminBtn);

    expect(screen.getByLabelText(/email address/i)).toHaveValue('admin@club.de');
    expect(screen.getByLabelText(/password/i)).toHaveValue('Password123!');
  });

  it('submits login form and navigates to dashboard on success', async () => {
    const user = userEvent.setup({ delay: null });
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'trainer1@club.de');
    await user.type(passInput, 'Password123!');

    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
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

    const emailInput = screen.getByLabelText(/email address/i);
    const passInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'wrong@club.de');
    await user.type(passInput, 'WrongPass123!');

    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });
});
