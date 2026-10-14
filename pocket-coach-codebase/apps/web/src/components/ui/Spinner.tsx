import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'current' | 'white';
  className?: string;
  label?: string;
}

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
} as const;

const COLORS = {
  current: 'border-current border-t-transparent',
  white: 'border-white border-t-transparent',
  primary: 'border-accent border-t-transparent',
} as const;

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
  label = 'Loading',
}) => (
  <div
    className={`inline-block rounded-full animate-spin ${SIZES[size]} ${COLORS[color]} ${className}`}
    role="status"
    aria-label={label}
  />
);
