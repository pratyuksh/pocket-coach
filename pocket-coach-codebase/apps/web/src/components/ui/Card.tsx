import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'bordered';
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
        return 'bg-slate-900 border border-slate-800 shadow-md';
      case 'bordered':
        return 'bg-slate-950/60 border border-emerald-500/20 shadow-sm';
      case 'glass':
      default:
        return 'bg-slate-900/75 backdrop-blur-xl border border-white/10 shadow-lg';
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return 'p-0';
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      case 'md':
      default:
        return 'p-4 sm:p-5';
    }
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-200 ${getVariantStyles()} ${getPaddingStyles()} ${className}`}
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
    className={`mb-3 pb-2 border-b border-white/5 flex items-center justify-between ${className}`}
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
  <h3 className={`text-lg font-semibold text-slate-100 tracking-tight ${className}`} {...props}>
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
    className={`mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);
