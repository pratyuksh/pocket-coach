import React from 'react';
import { Tag, type TagVariant } from './Tag';

/**
 * Legacy wrapper around Tag. The Modernist palette has no status colors, so success/info
 * map to neutral and warning/danger/gradient to accent. New code should use Tag.
 */
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gradient';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const TO_TAG: Record<BadgeVariant, TagVariant> = {
  neutral: 'neutral',
  success: 'neutral',
  info: 'neutral',
  warning: 'accent',
  danger: 'accent',
  gradient: 'accent',
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', ...props }) => (
  <Tag variant={TO_TAG[variant]} {...props} />
);
