import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrainerRoster } from '../features/trainers/TrainerRoster';

// Mock dependencies
const mockSelectProfiles = vi.fn();
const mockSelectRoles = vi.fn();
const mockDeleteRoles = vi.fn();
const mockDeleteProfiles = vi.fn();
const mockUseAuth = vi.fn();
const mockPermissions = {
  isSuperAdmin: true,
  isHeadTrainer: true,
  isTrainer: true,
  canInviteTrainers: true,
  canManageRoles: true,
  canRemoveTrainers: true,
  canManageSeasons: true,
  canCreateSurveys: true,
  canAssignTrainers: true,
  isJuniorCoach: false,
  isAuthenticated: true,
};

const mockUpdateProfiles = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => mockPermissions,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve(mockSelectProfiles()),
            }),
            order: () => Promise.resolve(mockSelectProfiles()),
          }),
          update: (data: any) => ({
            eq: (col: string, val: string) => {
              mockUpdateProfiles(data, col, val);
              return Promise.resolve({ error: null });
            },
          }),
          delete: () => ({
            eq: (col: string, val: string) => mockDeleteProfiles(col, val),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => Promise.resolve(mockSelectRoles()),
          delete: () => ({
            eq: (col: string, val: string) => mockDeleteRoles(col, val),
          }),
        };
      }
      return {};
    },
  },
}));

describe('TrainerRoster', () => {
  const sampleProfiles = [
    {
      id: 'admin-uuid',
      display_name: 'Super Admin User',
      email: 'admin@club.de',
      specialty: 'Management',
      is_junior_coach: false,
      is_active: true,
    },
    {
      id: 'trainer-uuid',
      display_name: 'Regular Trainer One',
      email: 'trainer1@club.de',
      specialty: 'Athletics',
      is_junior_coach: true,
      is_active: true,
    },
  ];

  const sampleRoles = [
    { profile_id: 'admin-uuid', role: 'super_admin' },
    { profile_id: 'trainer-uuid', role: 'trainer' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-uuid' },
      profile: sampleProfiles[0],
    });

    mockSelectProfiles.mockResolvedValue({
      data: sampleProfiles,
      error: null,
    });

    mockSelectRoles.mockResolvedValue({
      data: sampleRoles,
      error: null,
    });

    mockDeleteRoles.mockReturnValue({ error: null });
    mockDeleteProfiles.mockReturnValue(Promise.resolve({ error: null }));
  });

  it('fetches and renders trainer roster cards', async () => {
    render(<TrainerRoster />);

    await waitFor(() => {
      expect(screen.getByText('Super Admin User')).toBeInTheDocument();
      expect(screen.getByText('Regular Trainer One')).toBeInTheDocument();
      expect(screen.getByText('Athletics')).toBeInTheDocument();
      expect(screen.getByText('Junior Coach')).toBeInTheDocument();
    });
  });

  it('renders Remove button for non-self trainers when user is Super Admin', async () => {
    render(<TrainerRoster />);

    await waitFor(() => {
      // Super Admin User (self) should not have Remove button
      // Regular Trainer One should have Remove button
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      expect(removeButtons).toHaveLength(1);
    });
  });

  it('hides Remove buttons when user is not Super Admin', async () => {
    mockPermissions.canRemoveTrainers = false;
    render(<TrainerRoster />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    });
    mockPermissions.canRemoveTrainers = true; // reset
  });

  it('opens confirmation modal and executes trainer removal when confirmed', async () => {
    const user = userEvent.setup({ delay: null });
    render(<TrainerRoster />);

    await waitFor(() => {
      expect(screen.getByText('Regular Trainer One')).toBeInTheDocument();
    });

    // Click Remove button on trainer card
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    await user.click(removeBtn);

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText('Remove Trainer from Roster')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();
    });

    // Click Confirm Remove
    const confirmBtn = screen.getByRole('button', { name: /confirm remove/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteRoles).toHaveBeenCalledWith('profile_id', 'trainer-uuid');
      expect(mockUpdateProfiles).toHaveBeenCalledWith({ is_active: false }, 'id', 'trainer-uuid');
    });
  });
});
