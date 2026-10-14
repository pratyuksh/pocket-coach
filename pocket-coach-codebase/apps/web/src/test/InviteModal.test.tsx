import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteModal } from '../features/auth/InviteModal';
import i18n from '../i18n';

// Mock the supabase client
const mockSignUp = vi.fn();
const mockUpsert = vi.fn();

const mockSharedSignUp = vi.fn();

vi.mock('../lib/supabase', () => ({
  // Account creation must use the isolated client so the admin's session is preserved
  createIsolatedAuthClient: () => ({
    auth: {
      signUp: (...args: any[]) => mockSignUp(...args),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSharedSignUp(...args),
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

  const upsertOf = (table: string) =>
    mockUpsert.mock.calls.find((call: any) => call[0].table === table)?.[0].data;

  it('asks for an email and the extra roles, nothing else', () => {
    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Invite a trainer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Head trainer' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('checkbox', { name: 'Super-admin' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '14/18 coach' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeInTheDocument();
    // The invitee sets their own name; the form no longer asks for it
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<InviteModal isOpen={false} onClose={vi.fn()} />);

    expect(container.innerHTML).toBe('');
  });

  it('invites a plain trainer: isolated sign-up, profile and the base Trainer role', async () => {
    const user = userEvent.setup({ delay: null });
    const onSuccess = vi.fn();

    render(<InviteModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), 'new@club.de');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@club.de',
        password: 'Password123!',
        options: { data: { display_name: 'new' } },
      });
    });

    await waitFor(() => {
      expect(upsertOf('profiles')).toMatchObject({
        id: 'new-user-uuid',
        display_name: 'new',
        email: 'new@club.de',
        is_junior_coach: false,
        is_active: true,
      });
      expect(upsertOf('user_roles')).toEqual([{ profile_id: 'new-user-uuid', role: 'trainer' }]);
      expect(onSuccess).toHaveBeenCalled();
    });

    // The admin's own (shared) client never signs up, so the admin stays logged in
    expect(mockSharedSignUp).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Invitation sent' })).toBeInTheDocument();
    expect(screen.getByLabelText('Invitation link')).toHaveValue(
      `${window.location.origin}/invite/${btoa('new@club.de')}`,
    );
  });

  it('adds the chosen extra roles and the 14/18 label on top of the Trainer role', async () => {
    const user = userEvent.setup({ delay: null });

    render(<InviteModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'ht@club.de');
    await user.click(screen.getByRole('checkbox', { name: 'Head trainer' }));
    await user.click(screen.getByRole('checkbox', { name: '14/18 coach' }));
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    await waitFor(() => {
      expect(upsertOf('user_roles')).toEqual([
        { profile_id: 'new-user-uuid', role: 'trainer' },
        { profile_id: 'new-user-uuid', role: 'head_trainer' },
      ]);
      expect(upsertOf('profiles')).toMatchObject({ is_junior_coach: true });
    });
  });

  it('handles re-inviting an existing user by reactivating profile and role', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', status: 422 },
    });

    const user = userEvent.setup({ delay: null });
    const onSuccess = vi.fn();

    render(<InviteModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), 'reinvite@club.de');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    expect(await screen.findByRole('dialog', { name: 'Invitation sent' })).toBeInTheDocument();
    expect(upsertOf('profiles')).toMatchObject({
      id: 'existing-user-uuid',
      is_active: true,
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('shows a message and keeps the form when the invitation fails', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Signups not allowed', status: 400 },
    });
    const user = userEvent.setup({ delay: null });

    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'x@club.de');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Signups not allowed');
    expect(screen.getByLabelText('Email')).toHaveValue('x@club.de');
  });

  it('disables the submit button while sending', async () => {
    // Make signUp hang
    mockSignUp.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup({ delay: null });

    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'test@club.de');
    await user.click(screen.getByRole('button', { name: 'Send invite' }));

    expect(await screen.findByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('starts empty again when closed and reopened', async () => {
    const user = userEvent.setup({ delay: null });
    const { rerender } = render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'half@club.de');
    await user.click(screen.getByRole('checkbox', { name: 'Super-admin' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(<InviteModal isOpen={false} onClose={vi.fn()} />);
    rerender(<InviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Super-admin' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('is available in German', async () => {
    await i18n.changeLanguage('de');
    render(<InviteModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Trainer einladen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Einladung senden' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Cheftrainer' })).toBeInTheDocument();
  });
});
