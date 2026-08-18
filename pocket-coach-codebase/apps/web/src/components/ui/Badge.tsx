import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'danger':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'info':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'neutral':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-[11px] font-medium';
      case 'md':
      default:
        return 'px-2.5 py-1 text-xs font-semibold';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border transition-colors ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
