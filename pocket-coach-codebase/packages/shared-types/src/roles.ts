export type UserRole = 'trainer' | 'head_trainer' | 'super_admin';

export type AssignmentTrack = 'regular' | 'junior_coach';

export type SessionRole = 'primary' | 'assistant_coach';

export type AssignmentStatus = 'active' | 'absent_pending_sub' | 'replaced';

export function isHeadTrainer(roles: UserRole[]): boolean {
  return roles.includes('head_trainer') || roles.includes('super_admin');
}

export function isSuperAdmin(roles: UserRole[]): boolean {
  return roles.includes('super_admin');
}

export function hasRole(roles: UserRole[], requiredRole: UserRole): boolean {
  if (roles.includes('super_admin')) return true;
  if (requiredRole === 'head_trainer' && roles.includes('head_trainer')) return true;
  if (requiredRole === 'trainer' && roles.includes('trainer')) return true;
  return roles.includes(requiredRole);
}
