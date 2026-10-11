import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleManagerModal } from '../features/trainers/RoleManagerModal';

const mockSelect = vi.fn();
const mockRpc = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'user_roles') {
        return { select: () => ({ eq: () => mockSelect() }) };
      }
      return {};
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

describe('RoleManagerModal', () => {
  const sampleTrainer = {
    id: 'trainer-456',
    display_name: 'Jordan Miller',
    email: 'jordan@club.de',
    avatar_url: null,
    specialty: 'Youth U14 Coach',
    is_junior_coach: false,
    is_active: true,
    preferred_language: 'de' as const,
    calendar_token: 'token-456',
    created_at: '2026-08-18T00:00:00Z',
    updated_at: '2026-08-18T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue({
      data: [{ role: 'trainer' }, { role: 'head_trainer' }],
      error: null,
    });
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it('renders modal with trainer details and roles', async () => {
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    await waitFor(() => {
      expect(screen.getByText('Manage Roles: Jordan Miller')).toBeInTheDocument();
      expect(screen.getByText('jordan@club.de')).toBeInTheDocument();
      expect(screen.getByText('Permanent Base Role')).toBeInTheDocument();
    });
  });

  it('toggles elevated roles and saves them in one set_user_roles call', async () => {
    const user = userEvent.setup({ delay: null });
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <RoleManagerModal
        isOpen={true}
        onClose={mockOnClose}
        trainer={sampleTrainer}
        onSuccess={mockOnSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Head Trainer')).toBeInTheDocument();
    });

    // Click Super Admin role card to enable it
    const superAdminCard = screen.getByText('Super Admin').closest('div');
    if (superAdminCard) await user.click(superAdminCard);

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith('set_user_roles', {
        p_profile_id: 'trainer-456',
        p_roles: expect.arrayContaining(['head_trainer', 'super_admin']),
        p_is_junior_coach: false,
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('lets a Super-admin set the 14/18 Coach label and saves it with the roles', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    const labelToggle = await screen.findByRole('checkbox', { name: /14\/18 coach/i });
    expect(labelToggle).toHaveAttribute('aria-checked', 'false');
    await user.click(labelToggle);
    expect(labelToggle).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        'set_user_roles',
        expect.objectContaining({ p_profile_id: 'trainer-456', p_is_junior_coach: true }),
      );
    });
  });

  it('shows a readable message and stays open when the label change is blocked', async () => {
    const user = userEvent.setup({ delay: null });
    const mockOnClose = vi.fn();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'label_change_blocked', code: '23514' },
    });

    render(<RoleManagerModal isOpen={true} onClose={mockOnClose} trainer={sampleTrainer} />);

    await user.click(await screen.findByRole('checkbox', { name: /14\/18 coach/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText(/cannot change while this person has upcoming/i),
    ).toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows a readable message when removing your own Super-admin role is refused', async () => {
    const user = userEvent.setup({ delay: null });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'cannot_remove_own_super_admin', code: '42501' },
    });

    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    await screen.findByText('Head Trainer');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/cannot remove your own Super-admin role/i)).toBeInTheDocument();
  });
});
