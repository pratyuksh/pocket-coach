import React from 'react';

export type TagVariant = 'neutral' | 'accent' | 'accent-2' | 'outline';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<TagVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-800',
  accent: 'bg-accent-100 text-accent-800',
  'accent-2': 'bg-accent-2-100 text-accent-2-800',
  outline: 'border border-accent text-accent-700',
};

const SIZES = {
  sm: 'px-1.5 py-px text-[10px] uppercase tracking-wider',
  md: 'px-2.5 py-[3px] text-[11px] tracking-[0.02em]',
} as const;

export const Tag: React.FC<TagProps> = ({
  variant = 'neutral',
  size = 'md',
  className = '',
  children,
  ...props
}) => (
  <span
    className={`inline-flex items-center gap-1.5 font-semibold ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    {...props}
  >
    {children}
  </span>
);
