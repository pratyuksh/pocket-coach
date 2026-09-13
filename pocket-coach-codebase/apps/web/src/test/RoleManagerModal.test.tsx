import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleManagerModal } from '../features/trainers/RoleManagerModal';

const mockDelete = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => mockSelect(),
          }),
          delete: () => ({
            eq: () => {
              mockDelete();
              return Promise.resolve({ error: null });
            },
          }),
          insert: (records: any[]) => {
            mockInsert(records);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    },
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
  });

  it('renders modal with trainer details and roles', async () => {
    render(
      <RoleManagerModal
        isOpen={true}
        onClose={vi.fn()}
        trainer={sampleTrainer}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Manage Roles: Jordan Miller')).toBeInTheDocument();
      expect(screen.getByText('jordan@club.de')).toBeInTheDocument();
      expect(screen.getByText('Permanent Base Role')).toBeInTheDocument();
    });
  });

  it('toggles elevated roles and saves updated role list', async () => {
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();
    const mockOnClose = vi.fn();

    render(
      <RoleManagerModal
        isOpen={true}
        onClose={mockOnClose}
        trainer={sampleTrainer}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Head Trainer')).toBeInTheDocument();
    });

    // Click Super Admin role card to enable it
    const superAdminCard = screen.getByText('Super Admin').closest('div');
    if (superAdminCard) await user.click(superAdminCard);

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ profile_id: 'trainer-456', role: 'trainer' }),
          expect.objectContaining({ profile_id: 'trainer-456', role: 'head_trainer' }),
          expect.objectContaining({ profile_id: 'trainer-456', role: 'super_admin' }),
        ])
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
