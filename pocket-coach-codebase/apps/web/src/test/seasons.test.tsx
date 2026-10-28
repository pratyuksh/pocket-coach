import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';
import { TemplateSelector } from '../features/seasons/components/TemplateSelector';
import { SeasonSetupModal } from '../features/seasons/components/SeasonSetupModal';
import { SessionOverrideModal } from '../features/sessions/components/SessionOverrideModal';
import type { EnrichedSession } from '../features/sessions/hooks/useSessions';
import type { SeasonTemplate } from '@pocket-coach/shared-types';

// Mock Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: 104, error: null }),
  },
}));

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageSeasons: true, isHeadTrainer: true, isSuperAdmin: false }),
}));

// Mock hooks
vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      {
        id: 'loc-1',
        name: 'Sporthalle Schulhaus Apfelbaum',
        district_area: 'Oerlikon',
        address: null,
        trainer_note: null,
        is_active: true,
      },
      { id: 'loc-2', name: 'Sporthalle Borrweg', district_area: 'Friesenberg', is_active: true },
      {
        id: 'loc-3',
        name: 'Sporthalle Wolfsblick',
        district_area: 'Zürich-Affoltern',
        address: null,
        trainer_note: null,
        is_active: true,
      },
    ],
    loading: false,
    error: null,
    addLocation: mockAddLocation,
    updateLocation: mockUpdateLocation,
  }),
}));

const mockUpdateLocation = vi.fn().mockResolvedValue({});
const mockAddLocation = vi
  .fn()
  .mockResolvedValue({ id: 'loc-4', name: 'New Hall', is_active: true });

const mockCreateSeason = vi
  .fn()
  .mockResolvedValue({ season: { id: 's-1', name: 'Season 2026/2027' }, generatedCount: 104 });

vi.mock('../features/seasons/hooks/useSeasons', () => ({
  useSeasons: () => ({
    seasons: [],
    activeSeason: null,
    templates: [
      {
        id: 'tpl-1',
        name: 'Standard Junior Season',
        description: 'Standard schedule across 3 halls',
        is_default: true,
        template_data: {
          player_groups: [
            { name: 'Kids / Basic', description: '', sort_order: 1 },
            { name: 'Advanced-1', description: '', sort_order: 2 },
            { name: 'Advanced-2', description: '', sort_order: 3 },
          ],
          training_days: [
            {
              day_of_week: 2,
              default_start_time: '17:30:00',
              default_end_time: '19:00:00',
              location_name: 'Sporthalle Schulhaus Apfelbaum',
              groups: ['Kids / Basic', 'Advanced-1', 'Advanced-2'],
            },
          ],
        },
      },
    ],
    loading: false,
    error: null,
    createSeason: mockCreateSeason,
    generateSessions: vi.fn().mockResolvedValue(104),
  }),
}));

describe('Sub-Phase 1.3: Seasons & Hall Locations Component Tests', () => {
  describe('TemplateSelector', () => {
    const mockTemplates: SeasonTemplate[] = [
      {
        id: 'tpl-1',
        name: 'Standard Junior Season',
        description: 'Default schedule with 3 hall locations',
        is_default: true,
        template_data: {
          player_groups: [],
          training_days: [],
        },
        created_at: '2026-09-27T00:00:00Z',
      },
    ];

    it('renders default template option and custom setup card', () => {
      render(
        <TemplateSelector
          templates={mockTemplates}
          selectedTemplateId="tpl-1"
          onSelectTemplate={vi.fn()}
        />,
      );

      expect(screen.getByText('Standard Junior Season')).toBeInTheDocument();
      expect(screen.getByText('Custom Blank Schedule')).toBeInTheDocument();
    });

    it('invokes onSelectTemplate callback when a template card is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onSelect = vi.fn();

      render(
        <TemplateSelector
          templates={mockTemplates}
          selectedTemplateId={null}
          onSelectTemplate={onSelect}
        />,
      );

      await user.click(screen.getByText('Standard Junior Season'));
      expect(onSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });
  });

  describe('SessionOverrideModal', () => {
    const sampleSession: EnrichedSession = {
      id: 'sess-1',
      season_id: 'season-1',
      block_week_id: null,
      session_date: '2026-10-06',
      day_of_week: 2,
      start_time: '17:30:00',
      end_time: '19:00:00',
      location_id: 'loc-1',
      is_time_overridden: false,
      required_regular: 3,
      required_junior: 1,
      published_at: '2026-09-27T00:00:00Z',
      created_at: '2026-09-27T00:00:00Z',
    };

    it('renders target date and submits override updates', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <SessionOverrideModal
          session={sampleSession}
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      expect(screen.getAllByText(/2026-10-06/i).length).toBeGreaterThan(0);

      const saveButton = screen.getByRole('button', { name: /Save change/i });
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(onSave).toHaveBeenCalledWith('sess-1', {
        start_time: '17:30:00',
        end_time: '19:00:00',
        location_id: 'loc-1',
      });
    });
  });

  describe('SeasonSetupModal', () => {
    it('navigates through steps and submits season creation', async () => {
      const onSuccess = vi.fn();

      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);

      expect(screen.getByText('Create new season')).toBeInTheDocument();

      // Step 1 -> Step 2
      await act(async () => {
        fireEvent.click(screen.getByText(/Next: Configure Schedule/i));
      });
      expect(screen.getByText(/Weekly Training Slots/i)).toBeInTheDocument();

      // Step 2 -> Step 3
      await act(async () => {
        fireEvent.click(screen.getByText(/Next: Review & Confirm/i));
      });
      expect(screen.getByText(/Ready for Generation/i)).toBeInTheDocument();

      // Step 3 Confirm & Generate
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Confirm & Generate/i }));
      });

      expect(mockCreateSeason).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });

    it('shows the steps, marks the current one and offers no hall manager', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const steps = screen.getByRole('list', { name: 'Steps' });
      expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
      expect(screen.queryByRole('button', { name: /manage halls/i })).not.toBeInTheDocument();

      await user.click(screen.getByText(/Next: Configure schedule/i));
      expect(within(steps).getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step');
      expect(screen.getByText(/Halls are managed in Settings/i)).toBeInTheDocument();
    });

    it('counts slots, halls and groups of the template instead of showing fixed numbers', () => {
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const group = screen.getByRole('radiogroup', { name: 'Schedule template' });
      const template = within(group).getByRole('radio', { name: /Standard Junior Season/ });
      expect(template).toBeChecked();
      expect(template).toHaveTextContent('1 weekly slot');
      expect(template).toHaveTextContent('1 hall');
      expect(template).toHaveTextContent('3 player groups');
    });

    it('lets the user choose the blank schedule, which starts without slots, and go back to the template', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await user.click(screen.getByRole('radio', { name: /Custom Blank Schedule/ }));
      expect(screen.getByRole('radio', { name: /Custom Blank Schedule/ })).toBeChecked();
      expect(screen.getByRole('radio', { name: /Standard Junior Season/ })).not.toBeChecked();

      await user.click(screen.getByText(/Next: Configure schedule/i));
      expect(screen.getByText('No weekly slots yet. Add one to continue.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /^← Back/ }));

      await user.click(screen.getByRole('radio', { name: /Standard Junior Season/ }));
      await user.click(screen.getByText(/Next: Configure schedule/i));
      expect(screen.getByText(/Weekly training slots \(1\)/)).toBeInTheDocument();
    });

    it('toggles whether the new season becomes the active one', async () => {
      const user = userEvent.setup({ delay: null });
      mockCreateSeason.mockClear();
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const active = screen.getByRole('checkbox', { name: 'Set as active season' });
      expect(active).toBeChecked();
      await user.click(active);
      expect(active).not.toBeChecked();

      await user.click(screen.getByText(/Next: Configure schedule/i));
      await user.click(screen.getByText(/Next: Review & confirm/i));
      await user.click(screen.getByRole('button', { name: /Confirm & generate/i }));
      expect(mockCreateSeason).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
    });

    it('edits a slot (weekday, groups) and removes it', async () => {
      const user = userEvent.setup({ delay: null });
      mockCreateSeason.mockClear();
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
      await user.click(screen.getByText(/Next: Configure schedule/i));

      await user.selectOptions(screen.getByLabelText('Weekday'), '4');
      await user.click(screen.getByRole('button', { name: /Advanced-2/ }));
      expect(screen.getByRole('button', { name: /Advanced-2/ })).toHaveAttribute(
        'aria-pressed',
        'false',
      );

      await user.click(screen.getByText(/Next: Review & confirm/i));
      const summary = screen.getByTestId('slot-summary');
      expect(summary).toHaveTextContent('Thursday');
      expect(summary).toHaveTextContent('17:30–19:00');
      expect(summary).toHaveTextContent('Kids / Basic, Advanced-1');
      expect(summary).toHaveTextContent('3 + 1 trainers');
      await user.click(screen.getByRole('button', { name: /Confirm & generate/i }));
      expect(mockCreateSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          slots: [
            expect.objectContaining({
              day_of_week: 4,
              player_group_names: ['Kids / Basic', 'Advanced-1'],
            }),
          ],
        }),
      );
    });

    it('adds and removes slots, and cannot continue without one', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
      await user.click(screen.getByText(/Next: Configure schedule/i));

      await user.click(screen.getByRole('button', { name: /Remove slot/i }));
      expect(screen.getByText('No weekly slots yet. Add one to continue.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next: Review & confirm/i })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: /Add slot/i }));
      expect(screen.getByText(/Weekly training slots \(1\)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next: Review & confirm/i })).toBeEnabled();
    });

    it('shows the error and stays on the review step when creating fails', async () => {
      const user = userEvent.setup({ delay: null });
      const onSuccess = vi.fn();
      mockCreateSeason.mockRejectedValueOnce(new Error('A season with this name already exists.'));
      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={onSuccess} />);
      await user.click(screen.getByText(/Next: Configure schedule/i));
      await user.click(screen.getByText(/Next: Review & confirm/i));
      await user.click(screen.getByRole('button', { name: /Confirm & generate/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'A season with this name already exists.',
      );
      expect(onSuccess).not.toHaveBeenCalled();
      expect(screen.getByText('Ready for generation')).toBeInTheDocument();
    });

    it('is in German when the language is German', async () => {
      await i18n.changeLanguage('de');
      try {
        const user = userEvent.setup({ delay: null });
        render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

        expect(screen.getByText('Neue Saison erstellen')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Als aktive Saison festlegen' })).toBeChecked();
        await user.click(screen.getByText(/Weiter: Wochenplan einrichten/));
        expect(screen.getByLabelText('Wochentag')).toBeInTheDocument();
        await user.click(screen.getByText(/Weiter: Prüfen & bestätigen/));
        expect(screen.getByTestId('slot-summary')).toHaveTextContent('Dienstag');
        expect(
          screen.getByRole('button', { name: /Bestätigen & \d+ Trainings erstellen/ }),
        ).toBeInTheDocument();
      } finally {
        await i18n.changeLanguage('en');
      }
    });

    it('defaults staffing targets by weekday and submits edited targets', async () => {
      const user = userEvent.setup({ delay: null });
      mockCreateSeason.mockClear();

      render(<SeasonSetupModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);
      await user.click(screen.getByText(/Next: Configure Schedule/i));

      // Tuesday slot from a template without targets defaults to 3 regular + 1 14/18
      const regular = screen.getByLabelText(/regular trainers needed/i);
      expect(regular).toHaveValue(3);
      expect(screen.getByLabelText(/14\/18 coaches needed/i)).toHaveValue(1);

      fireEvent.change(regular, { target: { value: '2' } });
      await user.click(screen.getByText(/Next: Review & Confirm/i));
      await user.click(screen.getByRole('button', { name: /Confirm & Generate/i }));

      expect(mockCreateSeason).toHaveBeenCalledWith(
        expect.objectContaining({
          slots: [expect.objectContaining({ required_regular: 2, required_junior: 1 })],
        }),
      );
    });
  });
});
