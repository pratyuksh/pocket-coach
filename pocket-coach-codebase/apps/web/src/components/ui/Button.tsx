import React from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
      case 'secondary':
        return 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700';
      case 'outline':
        return 'bg-transparent text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10';
      case 'ghost':
        return 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white';
      case 'danger':
        return 'bg-rose-600 text-white hover:bg-rose-500 shadow-md shadow-rose-900/30';
      case 'primary':
      default:
        return 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5';
      case 'lg':
        return 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5';
      case 'md':
      default:
        return 'px-4 py-2 text-sm font-semibold rounded-lg gap-2';
    }
  };

  const baseStyles =
    'inline-flex items-center justify-center transition-all duration-150 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

  return (
    <button
      className={`${baseStyles} ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" color="current" /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
