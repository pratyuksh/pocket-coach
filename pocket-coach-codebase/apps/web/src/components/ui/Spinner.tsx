import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'current' | 'white';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4 border-2';
      case 'lg':
        return 'w-8 h-8 border-3';
      case 'md':
      default:
        return 'w-6 h-6 border-2';
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'current':
        return 'border-current border-t-transparent';
      case 'white':
        return 'border-white border-t-transparent';
      case 'primary':
      default:
        return 'border-emerald-500 border-t-transparent';
    }
  };

  return (
    <div
      className={`inline-block rounded-full animate-spin ${getSizeClass()} ${getColorClass()} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
