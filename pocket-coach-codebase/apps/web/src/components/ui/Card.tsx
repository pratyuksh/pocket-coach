import React from 'react';

/**
 * Flat Modernist card. `glass` and `solid` are legacy aliases of the default surface card.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'bordered' | 'interactive' | 'glass' | 'solid';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  surface: 'bg-surface',
  glass: 'bg-surface',
  solid: 'bg-surface',
  bordered: 'bg-bg border-2 border-divider',
  interactive: 'bg-surface cursor-pointer hover:bg-neutral-200',
} as const;

const PADDING = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
} as const;

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  padding = 'md',
  className = '',
  ...props
}) => (
  <div className={`${VARIANTS[variant]} ${PADDING[padding]} ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`mb-4 pb-3 border-b-2 border-divider ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-[17px] leading-tight font-heading ${className}`} {...props}>
    {children}
  </h3>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`mt-5 pt-3 border-t-2 border-divider flex flex-row items-center justify-end gap-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);
