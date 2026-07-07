import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/cn';

const SyncStatus: React.FC = () => {
  const { supabaseReady, supabaseConnected } = useAuth();

  const tone = !supabaseReady ? 'warning' : supabaseConnected ? 'success' : 'error';
  const label = !supabaseReady
    ? 'Not configured'
    : supabaseConnected
      ? 'Cloud synced'
      : 'Offline';

  return (
    <span className="flex items-center gap-2 text-xs text-[var(--text-muted)]" role="status">
      <span
        className={cn(
          'ui-status-dot',
          tone === 'success' && 'ui-status-success',
          tone === 'warning' && 'ui-status-warning',
          tone === 'error' && 'ui-status-error'
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
};

export default SyncStatus;
