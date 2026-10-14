import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/layout/ProtectedRoute';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  return <div>login page (came from {from ?? 'nowhere'})</div>;
}

const renderAt = (path: string, ui: React.ReactNode, rest: React.ReactNode = null) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/dashboard" element={<div>dashboard page</div>} />
        <Route path="/sessions" element={ui} />
        {rest}
      </Routes>
    </MemoryRouter>,
  );

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a loading screen, not the page, while the session is being checked', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt(
      '/sessions',
      <ProtectedRoute>
        <div>secret page</div>
      </ProtectedRoute>,
    );

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('redirects a signed-out visitor to the login page and remembers where they were going', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt(
      '/sessions',
      <ProtectedRoute>
        <div>secret page</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('login page (came from /sessions)')).toBeInTheDocument();
    expect(screen.queryByText('secret page')).not.toBeInTheDocument();
  });

  it('renders the page for a signed-in user', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false });
    renderAt(
      '/sessions',
      <ProtectedRoute>
        <div>secret page</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('secret page')).toBeInTheDocument();
  });
});

describe('PublicOnlyRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the public page to a signed-out visitor', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt(
      '/sessions',
      <PublicOnlyRoute>
        <div>public page</div>
      </PublicOnlyRoute>,
    );

    expect(screen.getByText('public page')).toBeInTheDocument();
  });

  it('sends a signed-in user to the dashboard instead of the login page', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false });
    renderAt(
      '/sessions',
      <PublicOnlyRoute>
        <div>public page</div>
      </PublicOnlyRoute>,
    );

    expect(screen.getByText('dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('public page')).not.toBeInTheDocument();
  });

  it('renders neither page while the session is being checked', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderAt(
      '/sessions',
      <PublicOnlyRoute>
        <div>public page</div>
      </PublicOnlyRoute>,
    );

    expect(screen.queryByText('public page')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument();
  });
});
