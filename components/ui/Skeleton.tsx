import React from 'react';
import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, width, height }) => (
  <div
    className={cn('ui-skeleton', className)}
    style={{ width, height }}
    aria-hidden="true"
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="ui-card space-y-3" aria-busy="true" aria-label="Loading">
    <Skeleton height={12} width="40%" />
    <Skeleton height={32} width="60%" />
    <Skeleton height={8} width="100%" />
  </div>
);

export default Skeleton;
