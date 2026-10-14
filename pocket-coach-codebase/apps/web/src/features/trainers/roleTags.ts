import type { TFunction } from 'i18next';
import { isSuperAdmin } from '@pocket-coach/shared-types';
import type { Profile, UserRole } from '@pocket-coach/shared-types';

export interface TrainerWithRoles extends Profile {
  roles: UserRole[];
}

/** Tags shown next to a name: Super-admin, Head trainer, 14/18 coach (a plain trainer has none). */
export const roleTagLabels = (
  roles: UserRole[],
  isJuniorCoach: boolean,
  t: TFunction,
): string[] => [
  ...(isSuperAdmin(roles) ? [t('roles.superAdmin')] : []),
  ...(roles.includes('head_trainer') ? [t('roles.headTrainer')] : []),
  ...(isJuniorCoach ? [t('roles.junior')] : []),
];

export const initialsOf = (name: string): string =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
