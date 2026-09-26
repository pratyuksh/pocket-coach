import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-lg shadow-emerald-500/25 border border-emerald-300/30 font-bold';
      case 'secondary':
        return 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-white/10 shadow-md';
      case 'outline':
        return 'bg-slate-900/40 text-emerald-400 border border-emerald-500/35 hover:bg-emerald-500/15 hover:border-emerald-500/60 shadow-sm';
      case 'ghost':
        return 'bg-transparent text-slate-300 hover:bg-slate-800/80 hover:text-white';
      case 'danger':
        return 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-950/40 border border-rose-400/20';
      case 'primary':
      default:
        return 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40 border border-emerald-500/30 font-semibold';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs rounded-lg gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-base rounded-xl gap-2.5';
      case 'md':
      default:
        return 'px-4 py-2.5 text-sm rounded-xl gap-2';
    }
  };

  const baseStyles =
    'flex flex-row items-center justify-center transition-all duration-200 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none shrink-0';

  return (
    <button
      className={`${baseStyles} ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" color="current" />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      {children && <span className="inline-block truncate">{children}</span>}
      {!isLoading && rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </button>
  );
};
