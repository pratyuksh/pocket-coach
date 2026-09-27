import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthError } from '@supabase/supabase-js';
import { GoogleOAuthButton } from '../features/auth/GoogleOAuthButton';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

describe('GoogleOAuthButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Google Sign-In button', () => {
    render(<GoogleOAuthButton />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('triggers supabase.auth.signInWithOAuth with google provider when clicked', async () => {
    const user = userEvent.setup({ delay: null });
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com' },
      error: null,
    });

    render(<GoogleOAuthButton />);

    const btn = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(btn);

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    });
  });

  it('calls onError callback when OAuth returns an error', async () => {
    const user = userEvent.setup({ delay: null });
    const mockOnError = vi.fn();
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: new AuthError('Provider google is disabled in local environment', 400),
    });

    render(<GoogleOAuthButton onError={mockOnError} />);

    const btn = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Provider google is disabled in local environment');
    });
  });
});
