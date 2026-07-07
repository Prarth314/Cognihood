import React from 'react';
import Button from './Button';
import { cn } from '../../lib/cn';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  onBack,
  backLabel = 'Back',
}) => (
  <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3 min-w-0">
      {onBack && (
        <Button variant="secondary" iconOnly onClick={onBack} aria-label={backLabel}>
          <i className="fas fa-arrow-left" aria-hidden="true" />
        </Button>
      )}
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-1 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.label}>
                {i > 0 && <span className="ui-caption" aria-hidden="true">/</span>}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="ui-caption hover:text-[var(--text-primary)] transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="ui-caption">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="ui-h1 truncate">{title}</h1>
        {description && <p className="ui-body mt-0.5">{description}</p>}
      </div>
    </div>
    {actions && <div className={cn('flex items-center gap-2 flex-shrink-0')}>{actions}</div>}
  </header>
);

export default PageHeader;
