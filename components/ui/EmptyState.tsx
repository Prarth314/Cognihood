import React from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fa-inbox',
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="ui-empty" role="status">
    <div className="ui-empty-icon" aria-hidden="true">
      <i className={`fas ${icon}`} />
    </div>
    <div>
      <h3 className="ui-h2 mb-1">{title}</h3>
      <p className="ui-body max-w-sm">{description}</p>
    </div>
    {actionLabel && onAction && (
      <Button onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);

export default EmptyState;
