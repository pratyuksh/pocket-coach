import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  padding = 'md',
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'solid':
        return 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-main)]';
      case 'bordered':
        return 'bg-[var(--bg-surface-elevated)] border border-emerald-500/30 shadow-sm';
      case 'interactive':
        return 'bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border-glass)] shadow-[var(--shadow-main)] hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl cursor-pointer transition-all duration-300';
      case 'glass':
      default:
        return 'bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border-glass)] shadow-[var(--shadow-main)]';
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3 sm:p-4';
      case 'lg':
        return 'p-6 sm:p-8';
      case 'md':
      default:
        return 'p-5 sm:p-6';
    }
  };

  return (
    <div
      className={`rounded-3xl transition-all duration-200 ${getVariantStyles()} ${getPaddingStyles()} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`mb-4 pb-3 border-b border-[var(--border-glass)] ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-bold text-[var(--text-primary)] tracking-tight font-heading ${className}`} {...props}>
    {children}
  </h3>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`mt-5 pt-3.5 border-t border-[var(--border-glass)] flex flex-row items-center justify-end gap-2.5 ${className}`}
    {...props}
  >
    {children}
  </div>
);
