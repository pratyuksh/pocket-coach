import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  durationMs?: number;
  /** Optional action, for example "Undo". */
  actionLabel?: string;
  onAction?: () => void;
  /** Accessible name of the dismiss button. */
  dismissLabel?: string;
}

const EDGE = {
  success: 'border-t-text',
  info: 'border-t-text',
  error: 'border-t-accent',
} as const;

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
  durationMs = 4000,
  actionLabel,
  onAction,
  dismissLabel = 'Dismiss toast',
}) => {
  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-text text-bg border-t-2 ${EDGE[type]}`}
      role="alert"
    >
      <span className="text-sm font-semibold">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={() => {
            onAction();
            onClose();
          }}
          className="ml-2 text-sm font-extrabold underline underline-offset-4 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        className="p-1 ml-auto opacity-70 hover:opacity-100 cursor-pointer"
        aria-label={dismissLabel}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
