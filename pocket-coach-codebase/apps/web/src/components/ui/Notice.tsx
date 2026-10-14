import React from 'react';
import { useTranslation } from 'react-i18next';
import { Toast } from './Toast';

interface NoticeProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

/** A toast pinned to the bottom right, above the mobile tab bar. */
export const Notice: React.FC<NoticeProps> = ({ message, type = 'success', onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-[76px] right-4 z-50 md:bottom-6 md:right-6">
      <Toast type={type} message={message} onClose={onClose} dismissLabel={t('actions.dismiss')} />
    </div>
  );
};
