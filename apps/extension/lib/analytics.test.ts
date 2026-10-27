// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  openInPageSearch,
  openSidePanel,
} from './analytics-events';
import {
  ANALYTICS_MEASUREMENT_ID,
  buildAnalyticsRequestUrl,
} from './analytics-transport';

describe('analytics transport', () => {
  it('sends a product-entry event without behavior properties', () => {
    const url = buildAnalyticsRequestUrl(openSidePanel(), {
      clientId: '123.456',
      eventSequence: 2,
      measurementId: ANALYTICS_MEASUREMENT_ID,
      sessionId: 789,
    });

    expect(url.origin).toBe('https://www.google-analytics.com');
    expect(url.pathname).toBe('/g/collect');
    expect(url.searchParams.get('tid')).toBe('G-3WMCRSJL96');
    expect(url.searchParams.get('cid')).toBe('123.456');
    expect(url.searchParams.get('en')).toBe('open_side_panel');
    expect(url.searchParams.get('sid')).toBe('789');
    expect(url.searchParams.get('_s')).toBe('2');
    expect(
      [...url.searchParams.keys()].some((key) => key.startsWith('ep.')),
    ).toBe(false);
  });

  it('never adds page or document metadata', () => {
    const url = buildAnalyticsRequestUrl(openInPageSearch(), {
      clientId: '123.456',
      eventSequence: 1,
      measurementId: ANALYTICS_MEASUREMENT_ID,
      sessionId: 789,
    });

    expect(url.searchParams.get('en')).toBe('open_in_page_search');
    expect(url.searchParams.has('dl')).toBe(false);
    expect(url.searchParams.has('dr')).toBe(false);
    expect(url.searchParams.has('dt')).toBe(false);
  });
});
