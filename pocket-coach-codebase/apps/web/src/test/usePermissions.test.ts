import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../hooks/usePermissions';
import type { UserRole } from '@pocket-coach/shared-types';

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

function setupAuth(roles: UserRole[], opts: { isJuniorCoach?: boolean } = {}) {
  mockUseAuth.mockReturnValue({
    user: { id: 'test-user' },
    session: {},
    profile: {
      id: 'test-user',
      display_name: 'Test User',
      email: 'test@club.de',
      is_junior_coach: opts.isJuniorCoach ?? false,
    },
    roles,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  });
}

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Super Admin permissions', () => {
    it('grants all management permissions', () => {
      setupAuth(['super_admin']);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isSuperAdmin).toBe(true);
      expect(result.current.isHeadTrainer).toBe(true); // super_admin implies head_trainer
      expect(result.current.canInviteTrainers).toBe(true);
      expect(result.current.canManageRoles).toBe(true);
      expect(result.current.canRemoveTrainers).toBe(true);
      expect(result.current.canManageSeasons).toBe(true);
      expect(result.current.canCreateSurveys).toBe(true);
      expect(result.current.canAssignTrainers).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Head Trainer permissions', () => {
    it('grants management but not super admin', () => {
      setupAuth(['head_trainer']);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isHeadTrainer).toBe(true);
      expect(result.current.canManageRoles).toBe(false);
      expect(result.current.canInviteTrainers).toBe(false);
      expect(result.current.canRemoveTrainers).toBe(false);
      expect(result.current.canManageSeasons).toBe(true);
      expect(result.current.canCreateSurveys).toBe(true);
      expect(result.current.canAssignTrainers).toBe(true);
    });
  });

  describe('Regular Trainer permissions', () => {
    it('denies management permissions', () => {
      setupAuth(['trainer']);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isHeadTrainer).toBe(false);
      expect(result.current.isTrainer).toBe(true);
      expect(result.current.canManageRoles).toBe(false);
      expect(result.current.canRemoveTrainers).toBe(false);
      expect(result.current.canManageSeasons).toBe(false);
      expect(result.current.canCreateSurveys).toBe(false);
      expect(result.current.canAssignTrainers).toBe(false);
    });
  });

  describe('Junior Coach flag', () => {
    it('reflects profile is_junior_coach', () => {
      setupAuth(['trainer'], { isJuniorCoach: true });
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isJuniorCoach).toBe(true);
    });

    it('defaults to false when not set', () => {
      setupAuth(['trainer']);
      const { result } = renderHook(() => usePermissions());

      expect(result.current.isJuniorCoach).toBe(false);
    });
  });

  describe('Unauthenticated state', () => {
    it('returns false for isAuthenticated when no user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        profile: null,
        roles: [],
        loading: false,
        signOut: vi.fn(),
        refreshProfile: vi.fn(),
      });

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isSuperAdmin).toBe(false);
      expect(result.current.isHeadTrainer).toBe(false);
      expect(result.current.isTrainer).toBe(false);
    });
  });
});
