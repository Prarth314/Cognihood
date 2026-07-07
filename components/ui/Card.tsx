import React from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
  padding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className, muted, padding = true }) => (
  <div className={cn(muted ? 'ui-card-muted' : 'ui-card', !padding && '!p-0', className)}>
    {children}
  </div>
);

export default Card;
