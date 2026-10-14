/**
 * Phase 1 navigation: Home, Sessions, Gaps, Team, Settings. Availability returns with
 * Phase 2.1. Paths keep their existing names; only the labels follow the design.
 */
export interface NavItem {
  key: 'home' | 'sessions' | 'gaps' | 'team' | 'settings';
  path: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', path: '/dashboard' },
  { key: 'sessions', path: '/sessions' },
  { key: 'gaps', path: '/substitutions' },
  { key: 'team', path: '/trainers' },
  { key: 'settings', path: '/settings' },
];

/** The mobile tab bar leaves out Settings: it opens from the account button in the header. */
export const TAB_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((item) => item.key !== 'settings');
