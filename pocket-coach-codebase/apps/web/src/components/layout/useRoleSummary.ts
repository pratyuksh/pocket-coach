import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';

/** For example "Head trainer · 14/18 coach": the highest base role plus the coach label. */
export const useRoleSummary = (): string => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { isSuperAdmin, isHeadTrainer } = usePermissions();

  const base = isSuperAdmin
    ? t('roles.superAdmin')
    : isHeadTrainer
      ? t('roles.headTrainer')
      : t('roles.trainer');
  return profile?.is_junior_coach ? `${base} · ${t('roles.junior')}` : base;
};
