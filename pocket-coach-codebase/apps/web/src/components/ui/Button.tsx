import React from 'react';
import { Spinner } from './Spinner';

/**
 * Modernist button. Variants: primary (the one action of a view), secondary, ghost, and `icon`
 * for square icon-only buttons.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg border border-transparent hover:bg-accent-600 active:bg-accent-700',
  secondary: 'bg-transparent text-text border border-divider hover:bg-text/7 active:bg-text/15',
  ghost:
    'bg-transparent text-accent border border-transparent px-1 hover:bg-accent/10 active:bg-accent/20',
  icon: 'bg-transparent text-text border border-transparent size-9 !p-0 justify-center hover:bg-text/7 active:bg-text/15',
};

const SIZE_STYLES = {
  sm: 'min-h-8 px-3 text-[13px] gap-1.5',
  md: 'min-h-9 px-3.5 text-sm gap-1.5',
  lg: 'min-h-11 px-4 text-[15px] gap-2',
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-start font-heading font-extrabold leading-tight cursor-pointer select-none shrink-0 disabled:opacity-45 disabled:cursor-not-allowed ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" color="current" />
        ) : leftIcon ? (
          <span className="inline-flex shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
      </button>
    );
  },
);
Button.displayName = 'Button';
