import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteModal } from '../features/auth/InviteModal';

// Mock the supabase client
const mockSignUp = vi.fn();
const mockUpsert = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'existing-user-uuid' } }),
        }),
      }),
      upsert: (data: any) => {
        mockUpsert({ table, data });
        return Promise.resolve({ error: null });
      },
    }),
  },
}));

describe('InviteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'new-user-uuid' },
      },
      error: null,
    });
  });

  it('renders the form when open', () => {
    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Invite New Trainer / Coach')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('newtrainer@club.de')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Alex Schmidt')).toBeInTheDocument();
    expect(screen.getByText('Send Invitation')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<InviteModal isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('submits the invite form with correct data', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<InviteModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    // Fill in the form
    await user.type(screen.getByPlaceholderText('newtrainer@club.de'), 'new@club.de');
    await user.type(screen.getByPlaceholderText('e.g. Alex Schmidt'), 'New Trainer');

    // Submit
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@club.de',
        password: 'Password123!',
        options: {
          data: {
            display_name: 'New Trainer',
          },
        },
      });
    });

    // Should upsert profile and role
    await waitFor(() => {
      const profileCall = mockUpsert.mock.calls.find((call: any) => call[0].table === 'profiles');
      expect(profileCall).toBeDefined();
      expect(profileCall![0].data).toMatchObject({
        id: 'new-user-uuid',
        display_name: 'New Trainer',
        email: 'new@club.de',
      });
    });

    await waitFor(() => {
      const roleCall = mockUpsert.mock.calls.find((call: any) => call[0].table === 'user_roles');
      expect(roleCall).toBeDefined();
      expect(roleCall![0].data).toMatchObject({
        profile_id: 'new-user-uuid',
        role: 'trainer',
      });
    });

    // Should call onSuccess
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('handles re-inviting an existing user by reactivating profile and role', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', status: 422 },
    });

    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<InviteModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    await user.type(screen.getByPlaceholderText('newtrainer@club.de'), 'reinvite@club.de');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Invitation Sent!')).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('disables the submit button while loading', async () => {
    // Make signUp hang
    mockSignUp.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();

    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('newtrainer@club.de'), 'test@club.de');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      expect(screen.getByText('Sending Invite...')).toBeInTheDocument();
    });
  });

  it('allows selecting head_trainer role', async () => {
    const user = userEvent.setup();

    render(<InviteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Change role to Head Trainer
    await user.selectOptions(screen.getByDisplayValue('Trainer (Default)'), 'head_trainer');

    await user.type(screen.getByPlaceholderText('newtrainer@club.de'), 'ht@club.de');
    await user.click(screen.getByText('Send Invitation'));

    await waitFor(() => {
      const roleCall = mockUpsert.mock.calls.find((call: any) => call[0].table === 'user_roles');
      expect(roleCall).toBeDefined();
      expect(roleCall![0].data.role).toBe('head_trainer');
    });
  });
});
