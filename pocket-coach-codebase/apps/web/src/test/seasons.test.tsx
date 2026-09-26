import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../features/seasons/components/TemplateSelector';
import { SessionCard } from '../features/sessions/components/SessionCard';
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

// Mock hooks
vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [
      {
        id: 'loc-1',
        name: 'Sporthalle Schulhaus Apfelbaum',
        district_area: 'Oerlikon',
        is_active: true,
      },
      { id: 'loc-2', name: 'Sporthalle Borrweg', district_area: 'Friesenberg', is_active: true },
      {
        id: 'loc-3',
        name: 'Sporthalle Wolfsblick',
        district_area: 'Zürich-Affoltern',
        is_active: true,
      },
    ],
    loading: false,
    error: null,
    addLocation: vi.fn().mockResolvedValue({ id: 'loc-4', name: 'New Hall', is_active: true }),
    updateLocation: vi.fn().mockResolvedValue({}),
  }),
}));

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

  describe('SessionCard', () => {
    const sampleSession: EnrichedSession = {
      id: 'sess-1',
      season_id: 'season-1',
      block_week_id: null,
      session_date: '2026-10-06',
      day_of_week: 2, // Tuesday
      start_time: '17:30:00',
      end_time: '19:00:00',
      location_id: 'loc-1',
      is_time_overridden: false,
      created_at: '2026-09-27T00:00:00Z',
      location: {
        id: 'loc-1',
        name: 'Sporthalle Schulhaus Apfelbaum',
        district_area: 'Oerlikon',
        is_active: true,
        created_at: '2026-09-27T00:00:00Z',
      },
      player_groups: [
        {
          id: 'pg-1',
          season_id: 'season-1',
          name: 'Kids / Basic',
          description: null,
          sort_order: 1,
        },
        { id: 'pg-2', season_id: 'season-1', name: 'Advanced-1', description: null, sort_order: 2 },
      ],
    };

    it('renders session date, time range, hall location badge, and player groups', () => {
      render(<SessionCard session={sampleSession} />);

      expect(screen.getByText('Tuesday')).toBeInTheDocument();
      expect(screen.getByText('2026-10-06')).toBeInTheDocument();
      expect(screen.getByText('17:30 – 19:00')).toBeInTheDocument();
      expect(screen.getByText('Sporthalle Schulhaus Apfelbaum (Oerlikon)')).toBeInTheDocument();
      expect(screen.getByText('Kids / Basic')).toBeInTheDocument();
      expect(screen.getByText('Advanced-1')).toBeInTheDocument();
    });

    it('displays Overridden badge when is_time_overridden is true', () => {
      render(<SessionCard session={{ ...sampleSession, is_time_overridden: true }} />);

      expect(screen.getByText('Overridden')).toBeInTheDocument();
    });
  });

  describe('LocationManagerModal', () => {
    it('renders existing active sports hall locations', () => {
      render(<LocationManagerModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText('Sporthalle Schulhaus Apfelbaum')).toBeInTheDocument();
      expect(screen.getByText('Sporthalle Borrweg')).toBeInTheDocument();
      expect(screen.getByText('Sporthalle Wolfsblick')).toBeInTheDocument();
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

      const saveButton = screen.getByRole('button', { name: /Save Override/i });
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
  });
});
