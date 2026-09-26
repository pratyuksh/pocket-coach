import { useAuth } from './useAuth';
import { isHeadTrainer, isSuperAdmin, hasRole } from '@pocket-coach/shared-types';

export function usePermissions() {
  const { roles, profile, user } = useAuth();

  const userIsSuperAdmin = isSuperAdmin(roles);
  const userIsHeadTrainer = isHeadTrainer(roles);
  const userIsTrainer = hasRole(roles, 'trainer');
  const isJuniorCoach = profile?.is_junior_coach ?? false;

  return {
    isSuperAdmin: userIsSuperAdmin,
    isHeadTrainer: userIsHeadTrainer,
    isTrainer: userIsTrainer,
    isJuniorCoach,
    canInviteTrainers: userIsSuperAdmin,
    canManageRoles: userIsSuperAdmin,
    canRemoveTrainers: userIsSuperAdmin,
    canManageSeasons: userIsHeadTrainer || userIsSuperAdmin,
    canCreateSurveys: userIsHeadTrainer || userIsSuperAdmin,
    canAssignTrainers: userIsHeadTrainer || userIsSuperAdmin,
    isAuthenticated: !!user,
  };
}
