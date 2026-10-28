import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import { GapList } from '../features/gaps/GapList';
import { addDays } from './helpers/dates';

const h = vi.hoisted(() => ({
  sessions: [] as unknown[],
  filled: [] as unknown[],
  season: { id: 'season-1', name: 'Season 2026/27' } as unknown,
  coverageError: false,
}));

vi.mock('../lib/supabase', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      select: () => b,
      eq: () => b,
      not: () => b,
      gte: () => b,
      order: () => b,
      limit: () => b,
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(
          table === 'sessions'
            ? h.coverageError
              ? { data: null, error: new Error('boom') }
              : { data: h.sessions, error: null }
            : table === 'substitution_requests'
              ? { data: h.filled, error: null }
              : { data: [], error: null },
        ).then(resolve),
    });
    return b;
  };
  return { supabase: { from: builder } };
});
vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: h.season,
    slots: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../features/locations/hooks/useLocations', () => ({
  useLocations: () => ({
    locations: [{ id: 'hall-1', name: 'Sporthalle Borrweg', is_active: true }],
    loading: false,
    error: null,
  }),
}));

const reg = (n: number) =>
  Array.from({ length: n }, () => ({ track: 'regular', status: 'active' }));
const jun = (n: number) =>
  Array.from({ length: n }, () => ({ track: 'junior_coach', status: 'active' }));

const session = (
  id: string,
  daysAhead: number,
  assignments: unknown[],
  extra: Record<string, unknown> = {},
) => ({
  id,
  session_date: addDays(daysAhead),
  start_time: '17:30:00',
  end_time: '19:00:00',
  location_id: 'hall-1',
  required_regular: 3,
  required_junior: 1,
  assignments,
  ...extra,
});

const renderGaps = () =>
  render(
    <MemoryRouter>
      <GapList />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
  h.season = { id: 'season-1', name: 'Season 2026/27' };
  h.filled = [];
  h.coverageError = false;
  h.sessions = [
    session('full', 2, [...reg(3), ...jun(1)]),
    // two gaps: one trainer is missing and the 14/18 coach
    session('short', 3, reg(2)),
    // inside the window on its last day, and just outside it
    session('last-day', 13, [...reg(3), ...jun(0)]),
    session('too-far', 14, reg(0)),
  ];
});

describe('Gaps page', () => {
  it('lists the gaps of the next 14 days, one row per short track, each linking to its session', async () => {
    renderGaps();
    const rows = await screen.findAllByTestId('gap-row');

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('data-session-id'))).toEqual([
      'short',
      'short',
      'last-day',
    ]);
    expect(rows[0]).toHaveTextContent('1 trainer needed');
    expect(rows[1]).toHaveTextContent('1 14/18 coach needed');
    expect(rows[0]).toHaveTextContent('Sporthalle Borrweg');
    expect(rows[0]).toHaveTextContent('17:30');
    expect(rows[0]).toHaveAttribute('href', '/sessions/short');
    expect(rows[0]).toHaveAttribute('data-session-date', addDays(3));
    expect(screen.queryByText(/Every session is fully staffed/)).not.toBeInTheDocument();
  });

  it('leaves out gaps that are further than 14 days away and sessions that are staffed', async () => {
    renderGaps();
    await screen.findAllByTestId('gap-row');

    const ids = screen.getAllByTestId('gap-row').map((r) => r.getAttribute('data-session-id'));
    expect(ids).not.toContain('too-far');
    expect(ids).not.toContain('full');
  });

  it('says every session is staffed when there is no gap', async () => {
    h.sessions = [session('full', 2, [...reg(3), ...jun(1)])];
    renderGaps();

    expect(await screen.findByText('Every session is fully staffed.')).toBeInTheDocument();
    expect(screen.queryByTestId('gap-row')).not.toBeInTheDocument();
  });

  it('explains the page and shows recently filled gaps below the list', async () => {
    h.filled = [
      {
        id: 'f1',
        filled_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
        session: { session_date: addDays(2) },
        original: { display_name: 'Sofia Meier' },
        volunteer: { display_name: 'Aylin Demir' },
      },
    ];
    renderGaps();

    expect(
      await screen.findByText(/short of trainers or 14\/18 coaches in the next 14 days/),
    ).toBeInTheDocument();
    const row = await screen.findByTestId('filled-row');
    expect(row).toHaveTextContent('Aylin Demir covered for Sofia Meier');
    expect(screen.getByRole('heading', { name: 'Recently filled' })).toBeInTheDocument();
  });

  it('shows no sample gaps and no actions that do not exist yet', async () => {
    renderGaps();
    await screen.findAllByTestId('gap-row');

    expect(screen.queryByText(/Youth U16/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a message when the gaps cannot be loaded', async () => {
    h.coverageError = true;
    renderGaps();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the gaps.');
  });

  it('is in German when the language is German', async () => {
    await i18n.changeLanguage('de');
    renderGaps();

    const rows = await screen.findAllByTestId('gap-row');
    expect(rows[0]).toHaveTextContent('1 Trainer gesucht');
    expect(rows[1]).toHaveTextContent('1 14/18-Coach gesucht');
    expect(screen.getByRole('heading', { name: 'Lücken in der Besetzung' })).toBeInTheDocument();
  });
});
