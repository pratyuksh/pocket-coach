import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({ data: {}, error: null });

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
    const user = userEvent.setup();
    const mockOnError = vi.fn();
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({
      data: null,
      error: { message: 'Provider google is disabled in local environment' },
    });

    render(<GoogleOAuthButton onError={mockOnError} />);

    const btn = screen.getByRole('button', { name: /sign in with google/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Provider google is disabled in local environment');
    });
  });
});
