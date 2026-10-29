import type { BeforeSendEvent } from '@vercel/analytics';
import { publicPages, legalLinks } from './siteRoutes';

const publicPaths = new Set([...Object.keys(publicPages), ...legalLinks.map(([, path]) => path)]);

/** No account/session pages, URL parameters, fragments, or custom payloads go to analytics. */
export function filterAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  if (event.type !== 'pageview') return null;
  try {
    const url = new URL(event.url);
    if (!publicPaths.has(url.pathname) || url.searchParams.has('auth') || url.searchParams.has('code') || url.hash)
      return null;
    url.search = '';
    url.hash = '';
    return { ...event, url: url.href };
  } catch {
    return null;
  }
}
