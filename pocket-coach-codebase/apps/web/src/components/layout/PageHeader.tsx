import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { InboxDrawer } from './InboxDrawer';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

const headerButton =
  'relative h-[34px] border border-divider bg-bg px-2.5 text-[13px] font-semibold text-text cursor-pointer hover:bg-neutral-100';

/**
 * Page title with a one-line subtitle, and on the right the Inbox button and Sign out (a small
 * deviation from the design, which only has Sign out in Settings). On mobile the account button
 * (initials) opens Settings, because Settings is not in the tab bar. The unread badge and the
 * notification list arrive with Sub-Phase 1.6a; until then the drawer is empty.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [inboxOpen, setInboxOpen] = useState(false);
  const closeInbox = useCallback(() => setInboxOpen(false), []);
  const unread = 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  const name = profile?.display_name || user?.email || '';
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <header className="flex items-end justify-between gap-3 border-b-2 border-divider px-4 pb-3.5 pt-4 md:px-8 md:pb-4 md:pt-6">
      <div className="min-w-0">
        {subtitle && <p className="text-xs text-neutral-700">{subtitle}</p>}
        <h1 className="truncate text-[26px] md:text-[32px]">{title}</h1>
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          className={headerButton}
          aria-haspopup="dialog"
          onClick={() => setInboxOpen(true)}
        >
          {t('inbox.button')}
          {unread > 0 && (
            <span
              aria-label={t('inbox.unread', { count: unread })}
              className="absolute -right-[7px] -top-[7px] grid h-[18px] min-w-[18px] place-items-center bg-accent px-1 text-[11px] font-extrabold text-bg"
            >
              {unread}
            </span>
          )}
        </button>
        <button type="button" className={headerButton} onClick={handleSignOut}>
          {t('actions.signOut')}
        </button>
        <Link
          to="/settings"
          aria-label={t('shell.account')}
          title={t('shell.account')}
          className="md:hidden flex size-[34px] flex-none items-center justify-center border border-divider font-heading text-xs font-extrabold text-text no-underline hover:no-underline"
        >
          {initials}
        </Link>
      </div>
      <InboxDrawer isOpen={inboxOpen} onClose={closeInbox} />
    </header>
  );
};
