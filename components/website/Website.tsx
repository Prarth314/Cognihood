import React, { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LandingAuth from '../LandingAuth';
import ThemeToggle from '../ui/ThemeToggle';
import MarketingPage, { PublicHeader, PublicFooter } from './MarketingPage';
import { isAppPath, publicPages, safeAppDestination, type PublicPath } from '../../services/siteRoutes';
const Application = lazy(() => import('../../App'));

export default function Website() {
  const { user, loading, authNotice, isPasswordRecovery } = useAuth();
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const authentication = path === '/login' || Boolean(authNotice) || isPasswordRecovery;
  const protectedRoute = isAppPath(path);
  useEffect(() => {
    const privatePage = authentication || protectedRoute;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.append(robots); }
    robots.content = privatePage || !(path in publicPages) ? 'noindex, nofollow' : 'index, follow';
    const info = publicPages[path as PublicPath];
    document.title = authentication ? 'Sign in | CogniHood' : protectedRoute ? 'Your workspace | CogniHood' : info?.title ?? 'Page not found | CogniHood';
    if (info) document.querySelector('meta[name="description"]')?.setAttribute('content', info.description);
    if (protectedRoute && !loading && !user) window.location.replace(`/login?next=${encodeURIComponent(safeAppDestination(path))}`);
    if (authentication && path !== '/login') window.history.replaceState(null, '', '/login');
  }, [path, authentication, protectedRoute, loading, user]);
  if (protectedRoute && !authentication) {
    return <Suspense fallback={<div className="route-loading" role="status">Opening your workspace…</div>}>{loading || !user ? <div className="route-loading" role="status">Checking your session…</div> : <Application />}</Suspense>;
  }
  if (authentication) return <div className="auth-site"><a className="skip-to-content" href="#auth-content">Skip to sign in</a><PublicHeader path="/login" signedIn={Boolean(user)} /><main id="auth-content" className="auth-layout"><aside className="auth-story"><p className="eyebrow-new">Your CogniHood workspace</p><h1>A little more<br /><em>understanding.</em></h1><p>Start with a camera check. Explore local attention indicators. Make space for reflection.</p><div className="auth-principle"><span>01</span> Local camera processing by default</div><div className="auth-principle"><span>02</span> Clear consent before each session</div><div className="auth-principle"><span>03</span> Your judgment stays in control</div><p className="auth-story-note">Development-stage software for adults 18+. Setup and interaction only while safely parked.</p></aside><div className="auth-form-region"><ThemeToggle compact /><LandingAuth onAuthenticated={() => window.location.replace(safeAppDestination(new URLSearchParams(window.location.search).get('next')))} /></div></main><PublicFooter /></div>;
  if (path in publicPages) return <MarketingPage path={path as PublicPath} signedIn={Boolean(user)} />;
  return <div className="public-site"><PublicHeader path={path} /><main className="site-container page-hero"><p className="eyebrow-new">404 / A different direction</p><h1>This page<br /><em>isn’t here.</em></h1><p>The address may have changed. You can return home or open your workspace.</p><div className="action-row"><a className="site-button" href="/">Back to home ↗</a><a className="text-link" href="/app">Open app →</a></div></main><PublicFooter /></div>;
}
