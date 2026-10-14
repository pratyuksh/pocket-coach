import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleManagerModal } from '../features/trainers/RoleManagerModal';
import i18n from '../i18n';

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

  it('shows the person, the four rows and the current roles', async () => {
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    expect(
      await screen.findByRole('dialog', { name: 'Roles · Jordan Miller' }),
    ).toBeInTheDocument();
    expect(screen.getByText('jordan@club.de')).toBeInTheDocument();

    // The base Trainer role is always on and cannot be switched off
    const trainer = screen.getByRole('checkbox', { name: 'Trainer' });
    expect(trainer).toHaveAttribute('aria-checked', 'true');
    expect(trainer).toHaveAttribute('aria-disabled', 'true');

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Head trainer' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    );
    expect(screen.getByRole('checkbox', { name: 'Super-admin' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('does not toggle the base Trainer role', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    const trainer = await screen.findByRole('checkbox', { name: 'Trainer' });
    await user.click(trainer);
    expect(trainer).toHaveAttribute('aria-checked', 'true');
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

    const head = await screen.findByRole('checkbox', { name: 'Head trainer' });
    await waitFor(() => expect(head).toHaveAttribute('aria-checked', 'true'));
    await user.click(screen.getByRole('checkbox', { name: 'Super-admin' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

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

  it('lets a Super-admin set the 14/18 coach label and saves it with the roles', async () => {
    const user = userEvent.setup({ delay: null });
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    const labelToggle = await screen.findByRole('checkbox', { name: '14/18 coach' });
    expect(labelToggle).toHaveAttribute('aria-checked', 'false');
    await user.click(labelToggle);
    expect(labelToggle).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Save' }));

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

    await user.click(await screen.findByRole('checkbox', { name: '14/18 coach' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /cannot change while this person has upcoming/i,
    );
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows the same refusals in German', async () => {
    const user = userEvent.setup({ delay: null });
    await i18n.changeLanguage('de');
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'cannot_remove_own_super_admin', code: '42501' },
    });

    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    expect(
      await screen.findByRole('dialog', { name: 'Rollen · Jordan Miller' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Du kannst deine eigene Super-Admin-Rolle nicht entfernen.',
    );
  });

  it('shows a readable message when removing your own Super-admin role is refused', async () => {
    const user = userEvent.setup({ delay: null });
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'cannot_remove_own_super_admin', code: '42501' },
    });

    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    await screen.findByRole('checkbox', { name: 'Head trainer' });
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /cannot remove your own Super-admin role/i,
    );
  });

  it('tells the user when the current roles cannot be loaded', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'boom' } });
    render(<RoleManagerModal isOpen={true} onClose={vi.fn()} trainer={sampleTrainer} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the current roles.');
  });
});
