import { useTranslation } from 'react-i18next';
import { usePermissions } from '../../hooks/usePermissions';
import type { NavItem } from './navItems';

/** Label of a navigation item. "Home" is My sessions for trainers, Dashboard for Head-trainers. */
export const useNavLabel = () => {
  const { t } = useTranslation();
  const { isHeadTrainer } = usePermissions();
  return (key: NavItem['key']) =>
    key === 'home' && isHeadTrainer ? t('nav.homeHead') : t(`nav.${key}`);
};
