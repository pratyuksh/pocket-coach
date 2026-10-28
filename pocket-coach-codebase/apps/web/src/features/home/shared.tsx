import type { TFunction } from 'i18next';
import type { MyRole } from './hooks/useMyUpcoming';

/** Hall name lookup by id; sessions without a hall show nothing. */
export const hallNameFrom =
  (locations: { id: string; name: string }[]) =>
  (id: string | null): string =>
    id ? (locations.find((l) => l.id === id)?.name ?? '') : '';

export const roleLabel = (role: MyRole, t: TFunction): string => t(`profile.stats.${role}`);
