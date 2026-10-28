import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../features/seasons/components/TemplateSelector';
import { LocationManagerModal } from '../features/locations/components/LocationManagerModal';
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

  describe('LocationManagerModal', () => {
    it('renders existing active sports hall locations', () => {
      render(<LocationManagerModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Sporthalle Schulhaus Apfelbaum')).toBeInTheDocument();
      expect(screen.getByText('Sporthalle Borrweg')).toBeInTheDocument();
      expect(screen.getByText('Sporthalle Wolfsblick')).toBeInTheDocument();
    });

    it('saves a hall address and trainer note', async () => {
      const user = userEvent.setup({ delay: null });
      mockUpdateLocation.mockClear();
      render(<LocationManagerModal isOpen={true} onClose={vi.fn()} />);

      await user.click(screen.getAllByRole('button', { name: /edit details/i })[0]);
      await user.type(
        screen.getByLabelText(/address of sporthalle schulhaus apfelbaum/i),
        'Apfelbaumstrasse 12',
      );
      await user.type(
        screen.getByLabelText(/note for trainers at sporthalle schulhaus apfelbaum/i),
        'Entrance via the schoolyard',
      );
      await user.click(screen.getByRole('button', { name: /save details/i }));

      expect(mockUpdateLocation).toHaveBeenCalledWith('loc-1', {
        address: 'Apfelbaumstrasse 12',
        trainer_note: 'Entrance via the schoolyard',
      });
    });

    it('passes address and note when adding a hall', async () => {
      const user = userEvent.setup({ delay: null });
      mockAddLocation.mockClear();
      render(<LocationManagerModal isOpen={true} onClose={vi.fn()} />);

      await user.type(screen.getByPlaceholderText('e.g. Sporthalle Borrweg'), 'Neue Halle');
      await user.type(screen.getByLabelText(/^address$/i), 'Hallenweg 1, 8000 Zürich');
      await user.type(screen.getByLabelText(/note for trainers$/i), 'Key at reception');
      await user.click(screen.getByRole('button', { name: /add location/i }));

      expect(mockAddLocation).toHaveBeenCalledWith('Neue Halle', undefined, {
        address: 'Hallenweg 1, 8000 Zürich',
        trainer_note: 'Key at reception',
      });
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

      expect(screen.getByText('Create New Season')).toBeInTheDocument();

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
