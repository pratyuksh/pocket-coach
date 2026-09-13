import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrainerProfileEditor } from '../features/trainers/TrainerProfileEditor';

// Mock dependencies
const mockUseAuth = vi.fn();
const mockUpdate = vi.fn();
const mockRefreshProfile = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (data: any) => ({
        eq: (col: string, val: string) => {
          mockUpdate(data, col, val);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

describe('TrainerProfileEditor', () => {
  const sampleProfile = {
    id: 'user-123',
    display_name: 'Alex Schmidt',
    email: 'alex@club.de',
    avatar_url: 'https://example.com/avatar.jpg',
    specialty: 'Youth U16 Tactics',
    preferred_language: 'de',
    is_junior_coach: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: sampleProfile,
      refreshProfile: mockRefreshProfile,
      signOut: vi.fn(),
    });
  });

  it('renders profile editor fields pre-populated with profile data', () => {
    render(<TrainerProfileEditor />);

    expect(screen.getByText('Trainer Profile & Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alex Schmidt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/avatar.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Youth U16 Tactics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alex@club.de')).toBeDisabled();
    expect(screen.getByText(/Live Calendar Feed Sync/i)).toBeInTheDocument();
  });

  it('updates profile settings including avatar_url on form submit', async () => {
    const user = userEvent.setup();
    render(<TrainerProfileEditor />);

    const avatarInput = screen.getByLabelText(/avatar image url/i);
    const specialtyInput = screen.getByLabelText(/responsibility \/ specialty focus/i);

    await user.clear(avatarInput);
    await user.type(avatarInput, 'https://example.com/new-avatar.png');

    await user.clear(specialtyInput);
    await user.type(specialtyInput, 'Conditioning Specialist');

    const saveBtn = screen.getByRole('button', { name: /save profile settings/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Alex Schmidt',
          avatar_url: 'https://example.com/new-avatar.png',
          specialty: 'Conditioning Specialist',
          preferred_language: 'de',
          is_junior_coach: false,
        }),
        'id',
        'user-123',
      );
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });

  it('allows regenerating calendar feed token', async () => {
    const user = userEvent.setup();
    render(<TrainerProfileEditor />);

    const regenBtn = screen.getByRole('button', { name: /regenerate link/i });
    await user.click(regenBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_token: expect.any(String),
        }),
        'id',
        'user-123',
      );
      expect(mockRefreshProfile).toHaveBeenCalled();
    });
  });
});

