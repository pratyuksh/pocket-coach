import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';

interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-hand notification drawer. The notification list itself arrives with Sub-Phase 1.6a;
 * until then it shows an empty state.
 */
export const InboxDrawer: React.FC<InboxDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        data-testid="inbox-backdrop"
        className="absolute inset-0 bg-neutral-900/35"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('inbox.title')}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l-2 border-text bg-bg md:w-[380px]"
      >
        <div className="flex items-center justify-between border-b-2 border-divider px-5 py-4">
          <h2 className="text-xl">{t('inbox.title')}</h2>
          <span className="flex gap-1.5">
            <Button variant="ghost" disabled>
              {t('inbox.markRead')}
            </Button>
            <Button
              ref={closeRef}
              variant="secondary"
              className="size-9 justify-center !px-0"
              aria-label={t('actions.close')}
              onClick={onClose}
            >
              ✕
            </Button>
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          <p className="px-5 py-4 text-sm text-neutral-700">{t('inbox.empty')}</p>
        </div>
      </div>
    </div>
  );
};
