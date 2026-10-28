import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Accessible name of the close button. */
  closeLabel?: string;
}

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
  closeLabel = 'Close modal',
}) => {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-neutral-900/50"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${MAX_WIDTH[maxWidth]} bg-bg border-2 border-text z-10`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b-2 border-divider">
            <h2 id={titleId} className="text-xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text hover:bg-text/7 cursor-pointer"
              aria-label={closeLabel}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5 text-text">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t-2 border-divider">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
