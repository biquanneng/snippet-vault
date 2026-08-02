// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { surfaceOpened } from './analytics-events';
import { buildAnalyticsRequestUrl } from './analytics-transport';

describe('analytics transport', () => {
  it('uses the GA4 collection endpoint with the public measurement ID', () => {
    const url = buildAnalyticsRequestUrl(surfaceOpened('side_panel'), {
      clientId: '123.456',
      eventSequence: 2,
      extensionVersion: '0.3.0',
      language: 'zh-CN',
      screenResolution: '1440x900',
      sessionId: 789,
    });

    expect(url.origin).toBe('https://www.google-analytics.com');
    expect(url.pathname).toBe('/g/collect');
    expect(url.searchParams.get('tid')).toBe('G-3WMCRSJL96');
    expect(url.searchParams.get('cid')).toBe('123.456');
    expect(url.searchParams.get('en')).toBe('surface_opened');
    expect(url.searchParams.get('sid')).toBe('789');
    expect(url.searchParams.get('_s')).toBe('2');
    expect(url.searchParams.get('ep.surface')).toBe('side_panel');
    expect(url.searchParams.get('ep.extension_version')).toBe('0.3.0');
    expect(url.searchParams.get('ul')).toBe('zh-CN');
    expect(url.searchParams.get('sr')).toBe('1440x900');
  });

  it('never adds page or document metadata', () => {
    const url = buildAnalyticsRequestUrl(surfaceOpened('in_page_search'), {
      clientId: '123.456',
      eventSequence: 1,
      sessionId: 789,
    });

    expect(url.searchParams.has('dl')).toBe(false);
    expect(url.searchParams.has('dr')).toBe(false);
    expect(url.searchParams.has('dt')).toBe(false);
  });
});
