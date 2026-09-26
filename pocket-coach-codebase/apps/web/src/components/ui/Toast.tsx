import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  onClose,
  durationMs = 4000,
}) => {
  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/80';
      case 'error':
        return 'border-rose-500/30 bg-rose-950/80';
      case 'info':
      default:
        return 'border-cyan-500/30 bg-slate-900/90';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl text-slate-100 animate-in slide-in-from-bottom-5 duration-200 ${getBorderColor()}`}
      role="alert"
    >
      {getIcon()}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 ml-auto text-slate-400 hover:text-white transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
