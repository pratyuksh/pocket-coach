// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { isHeadTrainer, isSuperAdmin, hasRole } from '@pocket-coach/shared-types';
import type { UserRole } from '@pocket-coach/shared-types';

describe('Role helper functions', () => {
  describe('isSuperAdmin', () => {
    it('returns true when roles include super_admin', () => {
      expect(isSuperAdmin(['super_admin'])).toBe(true);
      expect(isSuperAdmin(['trainer', 'super_admin'])).toBe(true);
    });

    it('returns false for non-admin roles', () => {
      expect(isSuperAdmin(['trainer'])).toBe(false);
      expect(isSuperAdmin(['head_trainer'])).toBe(false);
      expect(isSuperAdmin([])).toBe(false);
    });
  });

  describe('isHeadTrainer', () => {
    it('returns true for head_trainer role', () => {
      expect(isHeadTrainer(['head_trainer'])).toBe(true);
    });

    it('returns true for super_admin (implicit head trainer)', () => {
      expect(isHeadTrainer(['super_admin'])).toBe(true);
    });

    it('returns false for plain trainers', () => {
      expect(isHeadTrainer(['trainer'])).toBe(false);
      expect(isHeadTrainer([])).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('super_admin has access to all roles', () => {
      const roles: UserRole[] = ['super_admin'];
      expect(hasRole(roles, 'trainer')).toBe(true);
      expect(hasRole(roles, 'head_trainer')).toBe(true);
      expect(hasRole(roles, 'super_admin')).toBe(true);
    });

    it('head_trainer has access to head_trainer', () => {
      const roles: UserRole[] = ['head_trainer'];
      expect(hasRole(roles, 'head_trainer')).toBe(true);
    });

    it('trainer only has trainer access', () => {
      const roles: UserRole[] = ['trainer'];
      expect(hasRole(roles, 'trainer')).toBe(true);
      expect(hasRole(roles, 'head_trainer')).toBe(false);
      expect(hasRole(roles, 'super_admin')).toBe(false);
    });

    it('empty roles have no access', () => {
      expect(hasRole([], 'trainer')).toBe(false);
      expect(hasRole([], 'head_trainer')).toBe(false);
      expect(hasRole([], 'super_admin')).toBe(false);
    });
  });
});
