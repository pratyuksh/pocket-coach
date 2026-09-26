import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gradient';
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
      case 'gradient':
        return 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-300 border-emerald-400/40 shadow-sm shadow-emerald-500/10';
      case 'success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 shadow-sm shadow-emerald-950/20';
      case 'warning':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/35 shadow-sm shadow-amber-950/20';
      case 'danger':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/35 shadow-sm shadow-rose-950/20';
      case 'info':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35 shadow-sm shadow-cyan-950/20';
      case 'neutral':
      default:
        return 'bg-slate-800/80 text-slate-300 border-slate-700/80';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase';
      case 'md':
      default:
        return 'px-2.5 py-1 text-xs font-semibold tracking-tight';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md transition-all duration-150 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
