import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import Button from '../ui/Button';
import SyncStatus from '../SyncStatus';

export type AppView = 'landing' | 'selector' | 'predrive' | 'dashboard' | 'records';

interface NavItem {
  id: AppView;
  label: string;
  icon: string;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'selector', label: 'Home', icon: 'fa-house', description: 'Module selection' },
  { id: 'predrive', label: 'Start Trip', icon: 'fa-road', description: 'Pre-drive check' },
  { id: 'dashboard', label: 'Live Drive', icon: 'fa-gauge-high', description: 'Active monitoring' },
  { id: 'records', label: 'Archives', icon: 'fa-chart-line', description: 'Trip history' },
];

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  cogniId?: string | null;
  onSignOut?: () => void | Promise<void>;
  children: React.ReactNode;
  hideNav?: boolean;
  headerActions?: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  cogniId,
  onSignOut,
  children,
  hideNav,
  headerActions,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!sidebarOpen || desktop) return;
    const panel = sidebar.current;
    panel?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSidebarOpen(false); menuButton.current?.focus(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? []) as HTMLElement[];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [sidebarOpen, desktop]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleNav = (view: AppView) => {
    onNavigate(view);
    closeSidebar();
  };

  if (hideNav) {
    return <div className="min-h-dvh flex flex-col">{children}</div>;
  }

  return (
    <div className={`app-shell workspace-view-${currentView}`}>
      <div
        className={cn('sidebar-backdrop lg:hidden', sidebarOpen && 'visible')}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside id="workspace-navigation" ref={sidebar} inert={!desktop && !sidebarOpen} className={cn('app-sidebar', sidebarOpen && 'open')} aria-label="Main navigation">
        <button className="mobile-sidebar-close lg:hidden ui-btn ui-btn-ghost" onClick={() => { closeSidebar(); menuButton.current?.focus(); }}>Close navigation ×</button>
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white text-sm font-bold">
              C
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">CogniHood</div>
              {cogniId && <div className="ui-caption mono truncate">{cogniId}</div>}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1" aria-label="App sections">
          {NAV_ITEMS.map(item => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                  active
                    ? 'bg-[var(--primary-muted)] text-[var(--primary-hover)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <i className={cn('fas', item.icon, 'w-4 text-center')} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)] space-y-3">
          <SyncStatus />
          <a className="workspace-site-link" href="/">← Public website</a>
          <a
            href="/legal.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <i className="fas fa-scale-balanced w-4 text-center" aria-hidden="true" />
            Legal center
          </a>
          {onSignOut && (
            <Button variant="ghost" className="w-full justify-start" disabled={signingOut} onClick={async () => {
              setSigningOut(true); setSignOutError(null);
              try { await onSignOut(); } catch { setSignOutError('Could not sign out. Check your connection and try again.'); } finally { setSigningOut(false); }
            }}>
              <i className="fas fa-right-from-bracket" aria-hidden="true" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          )}
          {signOutError && <p role="alert" className="ui-field-error">{signOutError}</p>}
        </div>
      </aside>

      <div className="app-main lg:ml-[var(--sidebar-width)]">
        <div className="app-header">
          <Button
            variant="ghost"
            iconOnly
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="workspace-navigation"
            ref={menuButton}
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </Button>
          <div className="flex-1 min-w-0">
            <span className="ui-caption hidden sm:inline">
              Workspace / {NAV_ITEMS.find(n => n.id === currentView)?.description ?? 'CogniHood'}
            </span>
          </div>
          {headerActions}
        </div>
        <main className="app-content custom-scrollbar overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
