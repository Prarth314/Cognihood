import React from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  neutral: 'ui-badge-neutral',
  success: 'ui-badge-success',
  warning: 'ui-badge-warning',
  error: 'ui-badge-error',
  primary: 'ui-badge-primary',
};

const Badge: React.FC<BadgeProps> = ({ children, tone = 'neutral', className }) => (
  <span className={cn('ui-badge', toneClass[tone], className)}>{children}</span>
);

export default Badge;
