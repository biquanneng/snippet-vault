// SPDX-License-Identifier: MPL-2.0

export const ANALYTICS_MEASUREMENT_ID = 'G-3WMCRSJL96';

const ANALYTICS_COLLECT_ENDPOINT =
  'https://www.google-analytics.com/g/collect';

export interface AnalyticsRequestContext {
  clientId: string;
  eventSequence: number;
  measurementId: string;
  sessionId: number;
}

export interface AnalyticsTransportEvent {
  name: string;
  properties?: Record<
    string,
    boolean | number | string | undefined
  >;
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
  event: AnalyticsTransportEvent,
  context: AnalyticsRequestContext,
): URL {
  const url = new URL(ANALYTICS_COLLECT_ENDPOINT);
  const params = url.searchParams;

  params.set('v', '2');
  params.set('tid', context.measurementId);
  params.set('cid', context.clientId);
  params.set('en', sanitizeEventName(event.name));
  params.set('sid', String(context.sessionId));
  params.set('_s', String(context.eventSequence));
  params.set('sct', '1');
  params.set('seg', '1');

  Object.entries(event.properties ?? {}).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const parameterName = sanitizeParameterKey(key);
    if (typeof value === 'number') {
      params.set(`epn.${parameterName}`, String(value));
      return;
    }
    params.set(`ep.${parameterName}`, String(value));
  });

  return url;
}
