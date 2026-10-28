import { useTranslation } from 'react-i18next';
import type { NavItem } from './navItems';

/** Label of a navigation item. Home is called "Dashboard" for every role. */
export const useNavLabel = () => {
  const { t } = useTranslation();
  return (key: NavItem['key']) => t(`nav.${key}`);
};
