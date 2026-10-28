import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/Dashboard';
import { SessionsPage } from './pages/Sessions';
import { SessionDetailPage } from './pages/SessionDetail';
import { SubstitutionsPage } from './pages/Substitutions';
import { TrainersPage } from './pages/Trainers';
import { TrainerProfilePage } from './pages/TrainerProfile';
import { SettingsPage } from './pages/Settings';
import { LoginPage, InvitePage } from './pages/Auth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Shell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'sessions/:sessionId', element: <SessionDetailPage /> },
      { path: 'substitutions', element: <SubstitutionsPage /> },
      { path: 'trainers', element: <TrainersPage /> },
      { path: 'trainers/:profileId', element: <TrainerProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  // Invite-only: the public registration page is gone; old links land on the sign-in screen.
  { path: '/register', element: <Navigate to="/login" replace /> },
  { path: '/invite/:token', element: <InvitePage /> },
]);
