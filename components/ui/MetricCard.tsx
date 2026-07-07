import React from 'react';
import { cn } from '../../lib/cn';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  className?: string;
}

const valueTone: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-[var(--text-primary)]',
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  error: 'text-[var(--error)]',
  primary: 'text-[var(--primary)]',
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, hint, tone = 'default', className }) => (
  <div className={cn('ui-card flex flex-col gap-1', className)}>
    <span className="ui-caption font-medium uppercase tracking-wide">{label}</span>
    <span className={cn('text-2xl font-semibold tracking-tight', valueTone[tone])}>{value}</span>
    {hint && <span className="ui-caption">{hint}</span>}
  </div>
);

export default MetricCard;
