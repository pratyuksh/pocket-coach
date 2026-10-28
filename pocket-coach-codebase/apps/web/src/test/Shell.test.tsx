import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Shell } from '../components/layout/Shell';
import { usePageTitle } from '../components/layout/pageTitle';

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockSignOut = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (data: unknown) => ({
        eq: () => {
          mockUpdate(data);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));
vi.mock('../features/seasons/hooks/useActiveSeason', () => ({
  useActiveSeason: () => ({
    season: { id: 's1', name: 'Season 2026/27' },
    slots: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const signInAs = (roles: string[], profile = {}) =>
  mockUseAuth.mockReturnValue({
    user: { id: 'u1', email: 'alex@club.de' },
    profile: { id: 'u1', display_name: 'Alex Schmidt', is_junior_coach: false, ...profile },
    roles,
    refreshProfile: vi.fn(),
    signOut: mockSignOut,
  });

const TitledPage = () => {
  usePageTitle('Lena Brunner');
  return <p>a person</p>;
};

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>sign-in screen</p> },
      {
        path: '/',
        element: <Shell />,
        children: [
          { path: 'trainers/:profileId', element: <TitledPage /> },
          ...['dashboard', 'sessions', 'substitutions', 'trainers', 'settings'].map((p) => ({
            path: p,
            element: <p>content of {p}</p>,
          })),
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const sidebarLinks = (name = 'Main navigation') => {
  const nav = screen.getAllByRole('navigation', { name })[0];
  return within(nav).getAllByRole('link');
};

describe('Shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs(['trainer']);
  });

  it('offers the Phase 1 navigation and no Availability', () => {
    renderAt('/dashboard');

    expect(sidebarLinks().map((l) => l.textContent)).toEqual([
      'Dashboard',
      'Sessions',
      'Gaps',
      'Team',
      'Settings',
    ]);
    expect(screen.queryByText('Availability')).not.toBeInTheDocument();
  });

  it('names Home "Dashboard" for every role', () => {
    renderAt('/dashboard');
    expect(sidebarLinks()[0]).toHaveTextContent('Dashboard');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('marks the current page and shows its title and content', () => {
    renderAt('/sessions');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sessions');
    expect(screen.getByRole('main')).toHaveTextContent('content of sessions');
    expect(sidebarLinks()[1]).toHaveAttribute('aria-current', 'page');
    expect(sidebarLinks()[0]).not.toHaveAttribute('aria-current');
  });

  it('shows the season and calendar week on Home and the account line on Settings', () => {
    renderAt('/dashboard');
    expect(screen.getByText(/^Season 2026\/27 · CW \d{1,2}$/)).toBeInTheDocument();
  });

  it('shows "Your account" under Settings', () => {
    renderAt('/settings');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    expect(screen.getByText('Your account')).toBeInTheDocument();
  });

  it('shows the signed-in name and role in the sidebar', () => {
    signInAs(['trainer', 'head_trainer'], { is_junior_coach: true });
    renderAt('/dashboard');

    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByText('Alex Schmidt')).toBeInTheDocument();
    expect(within(sidebar).getByText('Head trainer · 14/18 coach')).toBeInTheDocument();
  });

  it('has a mobile tab bar without Settings and an account button that opens Settings', async () => {
    const router = renderAt('/dashboard');

    const [, tabBar] = screen.getAllByRole('navigation', { name: 'Main navigation' });
    expect(
      within(tabBar)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual(['Dashboard', 'Sessions', 'Gaps', 'Team']);

    await userEvent.click(screen.getByRole('link', { name: 'Your account and settings' }));
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('switches the whole shell to German from the sidebar', async () => {
    renderAt('/dashboard');

    const sidebar = screen.getByRole('complementary');
    await userEvent.click(within(sidebar).getByRole('radio', { name: 'DE' }));

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
    expect(sidebarLinks('Hauptnavigation').map((l) => l.textContent)).toEqual([
      'Dashboard',
      'Trainings',
      'Lücken',
      'Team',
      'Einstellungen',
    ]);
    expect(screen.getByText(/^Season 2026\/27 · KW \d{1,2}$/)).toBeInTheDocument();
  });

  it('has an Inbox button that opens an empty notification drawer and closes again', async () => {
    renderAt('/dashboard');

    await userEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    const drawer = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(drawer).getByText('No notifications yet.')).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Close' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    await userEvent.click(screen.getByTestId('inbox-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has a Sign out button next to Inbox that signs out and returns to sign-in', async () => {
    renderAt('/dashboard');

    const inbox = screen.getByRole('button', { name: 'Inbox' });
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    expect(inbox.nextElementSibling).toBe(signOut);

    await userEvent.click(signOut);
    expect(mockSignOut).toHaveBeenCalled();
    expect(await screen.findByText('sign-in screen')).toBeInTheDocument();
  });

  it('labels Inbox and Sign out in German', async () => {
    renderAt('/dashboard');
    await userEvent.click(
      within(screen.getByRole('complementary')).getByRole('radio', { name: 'DE' }),
    );

    expect(await screen.findByRole('button', { name: 'Abmelden' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Inbox' }));
    expect(screen.getByRole('dialog', { name: 'Mitteilungen' })).toBeInTheDocument();
  });

  it('lets a page replace the title, keeps the section highlighted, and restores the title', async () => {
    const router = renderAt('/trainers/p1');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lena Brunner');
    expect(screen.getByText('Coaching staff')).toBeInTheDocument();
    expect(sidebarLinks()[3]).toHaveAttribute('aria-current', 'page');

    await router.navigate('/sessions');
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sessions'),
    );
  });
});
