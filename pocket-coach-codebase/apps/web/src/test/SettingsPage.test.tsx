import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';
import { SettingsPage } from '../pages/Settings';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockRefreshProfile = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());
const mockAddLocation = vi.hoisted(() => vi.fn());
const mockUpdateLocation = vi.hoisted(() => vi.fn());
const mockRefetchSeason = vi.hoisted(() => vi.fn());
const mockDeleteSeason = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (data: unknown) => ({
        eq: (col: string, val: string) => {
          mockUpdate(data, col, val);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));
vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: {
      id: 's1',
      name: 'Season 2026/27',
      start_date: '2026-08-01',
      end_date: '2027-07-31',
      is_active: true,
    },
    slots: [
      {
        id: 'd1',
        dayOfWeek: 2,
        startTime: '17:30:00',
        endTime: '19:00:00',
        hall: 'Sporthalle Borrweg',
        groups: ['Kids / Basic', 'Advanced-1'],
      },
    ],
    loading: false,
    error: null,
    refetch: mockRefetchSeason,
  }),
}));
vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    loading: false,
    locations: [
      {
        id: 'h1',
        name: 'Sporthalle Borrweg',
        district_area: 'Friesenberg',
        address: 'Borrweg 70, 8055 Zürich',
        trainer_note: 'Key at reception',
        is_active: true,
      },
    ],
    addLocation: mockAddLocation,
    updateLocation: mockUpdateLocation,
  }),
}));
vi.mock('../features/seasons/hooks/useSeasons', () => ({
  useSeasons: () => ({ deleteSeason: mockDeleteSeason }),
}));
vi.mock('../features/seasons/components/SeasonSetupModal', () => ({
  SeasonSetupModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog">Season wizard</div> : null,
}));

const profile = {
  id: 'user-123',
  display_name: 'Alex Schmidt',
  email: 'alex@club.de',
  specialty: 'Youth U16 Tactics',
  preferred_language: 'en',
  is_junior_coach: false,
  calendar_token: 'tok-1',
};

const signInAs = (roles: string[], overrides: Partial<typeof profile> = {}) =>
  mockUseAuth.mockReturnValue({
    user: { id: 'user-123' },
    profile: { ...profile, ...overrides },
    roles,
    refreshProfile: mockRefreshProfile,
    signOut: mockSignOut,
  });

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddLocation.mockResolvedValue({});
    mockUpdateLocation.mockResolvedValue({});
    mockDeleteSeason.mockResolvedValue(undefined);
    signInAs(['trainer']);
  });

  describe('as a trainer', () => {
    it('shows profile, language and calendar, but not season or halls', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText('Display name')).toHaveValue('Alex Schmidt');
      // The email is shown as fixed text with a lock, not as a field
      expect(screen.getByText('alex@club.de')).toBeInTheDocument();
      expect(screen.getByText('Email', { selector: 'dt' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: "Can't be changed" })).toBeInTheDocument();
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue('alex@club.de')).not.toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeInTheDocument();
      expect(screen.getByText(/subscribe once/i)).toBeInTheDocument();

      expect(screen.queryByLabelText('Responsibility / speciality')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Season' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Halls' })).not.toBeInTheDocument();
    });

    it('saves only the display name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.clear(screen.getByLabelText('Display name'));
      await user.type(screen.getByLabelText('Display name'), 'Alexandra Schmidt');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(mockRefreshProfile).toHaveBeenCalled());
      const [payload, column, id] = mockUpdate.mock.calls[0];
      expect(payload).toEqual(
        expect.objectContaining({
          display_name: 'Alexandra Schmidt',
          updated_at: expect.any(String),
        }),
      );
      expect(payload).not.toHaveProperty('specialty');
      expect(payload).not.toHaveProperty('is_junior_coach');
      expect(payload).not.toHaveProperty('preferred_language');
      expect([column, id]).toEqual(['id', 'user-123']);
      expect(await screen.findByRole('alert')).toHaveTextContent('Profile saved.');
    });

    it('shows the 14/18 label read-only, without a way to change it', () => {
      signInAs(['trainer'], { is_junior_coach: true });
      render(<SettingsPage />);

      expect(screen.getByText('14/18 coach')).toBeInTheDocument();
      expect(screen.getByText(/managed by a super-admin in team/i)).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('regenerates the calendar link', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      expect(screen.getByLabelText('Calendar link')).toHaveTextContent(
        '/functions/v1/calendar-feed?token=tok-1',
      );
      await user.click(screen.getByRole('button', { name: 'Regenerate link' }));

      await waitFor(() => expect(mockRefreshProfile).toHaveBeenCalled());
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ calendar_token: expect.any(String) }),
        'id',
        'user-123',
      );
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'New link created. The old one has stopped working.',
      );
    });

    it('switches the language immediately and saves it to the profile', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('radio', { name: 'Deutsch' }));

      expect(await screen.findByLabelText('Anzeigename')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup', { name: 'Sprache' })).toBeInTheDocument();
      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith({ preferred_language: 'de' }, 'id', 'user-123'),
      );
    });

    it('signs out and returns to the sign-in screen', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Sign out' }));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'));
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('as a head trainer', () => {
    beforeEach(() => signInAs(['trainer', 'head_trainer']));

    it('saves the speciality with the name', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const speciality = screen.getByLabelText('Responsibility / speciality');
      expect(speciality).toHaveValue('Youth U16 Tactics');
      await user.clear(speciality);
      await user.type(speciality, 'Season planning');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ display_name: 'Alex Schmidt', specialty: 'Season planning' }),
          'id',
          'user-123',
        ),
      );
    });

    it('lists the season slots with weekday, time, hall and groups', () => {
      render(<SettingsPage />);

      const season = screen.getByRole('heading', { name: 'Season' }).closest('section')!;
      expect(within(season).getByText('Season 2026/27')).toBeInTheDocument();
      expect(within(season).getByText('1 Aug 2026 – 31 Jul 2027')).toBeInTheDocument();
      expect(within(season).getByText('Tue')).toBeInTheDocument();
      expect(within(season).getByText('17:30–19:00')).toBeInTheDocument();
      expect(within(season).getByText('Sporthalle Borrweg')).toBeInTheDocument();
      expect(within(season).getByText('Kids / Basic, Advanced-1')).toBeInTheDocument();
    });

    it('opens the season wizard from "New season"', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'New season' }));
      expect(screen.getByText('Season wizard')).toBeInTheDocument();
    });

    it('lists halls with a map link, address and note', () => {
      render(<SettingsPage />);

      const halls = screen.getByRole('heading', { name: 'Halls' }).closest('section')!;
      expect(within(halls).getByText('Friesenberg', { exact: false })).toBeInTheDocument();
      const link = within(halls).getByRole('link', { name: 'Open Sporthalle Borrweg on the map' });
      expect(link).toHaveTextContent('Borrweg 70, 8055 Zürich');
      expect(link).toHaveAttribute('href', expect.stringContaining('maps.google.com'));
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      expect(within(halls).getByText('Key at reception')).toBeInTheDocument();
    });

    it('adds a hall with address and note', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: '+ Add hall' }));
      const dialog = screen.getByRole('dialog', { name: 'Add hall' });
      await user.type(within(dialog).getByLabelText('Hall name'), 'Neue Halle');
      await user.type(within(dialog).getByLabelText('Address'), 'Hallenweg 1');
      await user.type(within(dialog).getByLabelText('Note for trainers'), 'Side door');
      await user.click(within(dialog).getByRole('button', { name: 'Save hall' }));

      await waitFor(() =>
        expect(mockAddLocation).toHaveBeenCalledWith('Neue Halle', '', {
          address: 'Hallenweg 1',
          trainer_note: 'Side door',
        }),
      );
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('edits the details of a hall', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Edit Sporthalle Borrweg' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit hall' });
      expect(within(dialog).getByLabelText('Address')).toHaveValue('Borrweg 70, 8055 Zürich');
      await user.clear(within(dialog).getByLabelText('Address'));
      await user.type(within(dialog).getByLabelText('Address'), 'Neuer Weg 5');
      await user.click(within(dialog).getByRole('button', { name: 'Save hall' }));

      await waitFor(() =>
        expect(mockUpdateLocation).toHaveBeenCalledWith('h1', {
          name: 'Sporthalle Borrweg',
          district_area: 'Friesenberg',
          address: 'Neuer Weg 5',
          trainer_note: 'Key at reception',
        }),
      );
    });

    it('shows a readable error and keeps the dialog open when saving a hall fails', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdateLocation.mockRejectedValue(new Error('boom'));
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Edit Sporthalle Borrweg' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit hall' });
      await user.click(within(dialog).getByRole('button', { name: 'Save hall' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Could not save the hall.',
      );
    });
  });

  describe('hall and season housekeeping (head trainer)', () => {
    beforeEach(() => signInAs(['trainer', 'head_trainer']));

    it('deactivates a hall', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Deactivate Sporthalle Borrweg' }));

      expect(mockUpdateLocation).toHaveBeenCalledWith('h1', { is_active: false });
      expect(await screen.findByText('Hall deactivated.')).toBeInTheDocument();
    });

    it('asks before deleting the season, then deletes it', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Delete season' }));
      const dialog = screen.getByRole('dialog', { name: 'Delete season' });
      expect(dialog).toHaveTextContent('Delete Season 2026/27?');
      expect(mockDeleteSeason).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Delete season' }));

      await waitFor(() => expect(mockDeleteSeason).toHaveBeenCalledWith('s1'));
      expect(await screen.findByText('Season deleted.')).toBeInTheDocument();
      expect(mockRefetchSeason).toHaveBeenCalled();
    });

    it('keeps the dialog open with a message when deleting fails', async () => {
      const user = userEvent.setup({ delay: null });
      mockDeleteSeason.mockRejectedValue(new Error('boom'));
      render(<SettingsPage />);

      await user.click(screen.getByRole('button', { name: 'Delete season' }));
      const dialog = screen.getByRole('dialog', { name: 'Delete season' });
      await user.click(within(dialog).getByRole('button', { name: 'Delete season' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Could not delete the season.',
      );
    });
  });

  it('renders in German', async () => {
    await i18n.changeLanguage('de');
    signInAs(['trainer', 'head_trainer']);
    render(<SettingsPage />);

    expect(screen.getByLabelText('Anzeigename')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Saison' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hallen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
  });
});
