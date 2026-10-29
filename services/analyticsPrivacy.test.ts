import { describe, expect, it } from 'vitest';
import { filterAnalyticsEvent } from './analyticsPrivacy';

describe('analytics privacy boundary', () => {
  it('excludes authenticated, login and password recovery URLs', () => {
    for (const path of ['/app/records', '/login', '/?auth=recovery', '/?code=fixture', '/#access_token=fixture']) {
      expect(filterAnalyticsEvent({ type: 'pageview', url: `https://example.invalid${path}` })).toBeNull();
    }
  });
  it('strips all query values from allowed public pageviews', () => {
    expect(
      filterAnalyticsEvent({
        type: 'pageview',
        url: 'https://example.invalid/mission?email=fixture%40example.invalid',
      }),
    ).toEqual({ type: 'pageview', url: 'https://example.invalid/mission' });
  });
});
