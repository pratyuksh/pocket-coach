import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Shell } from './components/layout/Shell';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/ProtectedRoute';
import { DashboardPage } from './pages/Dashboard';
import { SessionsPage } from './pages/Sessions';
import { AvailabilityPage } from './pages/Availability';
import { SubstitutionsPage } from './pages/Substitutions';
import { TrainersPage } from './pages/Trainers';
import { SettingsPage } from './pages/Settings';
import { LoginPage, RegisterPage, InvitePage } from './pages/Auth';

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
      { path: 'availability', element: <AvailabilityPage /> },
      { path: 'substitutions', element: <SubstitutionsPage /> },
      { path: 'trainers', element: <TrainersPage /> },
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
  { path: '/register', element: <RegisterPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
]);
