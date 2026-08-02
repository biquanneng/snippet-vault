// SPDX-License-Identifier: MPL-2.0

import type { AnalyticsEvent } from './analytics-events';

export const ANALYTICS_MEASUREMENT_ID = 'G-3WMCRSJL96';

const ANALYTICS_COLLECT_ENDPOINT =
  'https://www.google-analytics.com/g/collect';

export interface AnalyticsRequestContext {
  clientId: string;
  eventSequence: number;
  extensionVersion?: string;
  language?: string;
  screenResolution?: string;
  sessionId: number;
}

function sanitizeParameterKey(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 40) || 'unknown'
  );
}

function sanitizeEventName(value: string): string {
  return sanitizeParameterKey(value).toLowerCase();
}

export function buildAnalyticsRequestUrl(
  event: AnalyticsEvent,
  context: AnalyticsRequestContext,
): URL {
  const url = new URL(ANALYTICS_COLLECT_ENDPOINT);
  const params = url.searchParams;

  params.set('v', '2');
  params.set('tid', ANALYTICS_MEASUREMENT_ID);
  params.set('cid', context.clientId);
  params.set('en', sanitizeEventName(event.name));
  params.set('sid', String(context.sessionId));
  params.set('_s', String(context.eventSequence));
  params.set('sct', '1');
  params.set('seg', '1');

  if (context.extensionVersion) {
    params.set('ep.extension_version', context.extensionVersion);
  }
  if (context.language) {
    params.set('ul', context.language);
  }
  if (context.screenResolution) {
    params.set('sr', context.screenResolution);
  }

  Object.entries(event.properties).forEach(([key, value]) => {
    const parameterName = sanitizeParameterKey(key);
    if (typeof value === 'number') {
      params.set(`epn.${parameterName}`, String(value));
      return;
    }
    params.set(`ep.${parameterName}`, String(value));
  });

  return url;
}
