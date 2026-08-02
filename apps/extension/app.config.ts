// SPDX-License-Identifier: MPL-2.0

import { defineAnalyticsProvider } from '@wxt-dev/analytics';

import { analyticsEnabledStorage } from './lib/analytics-preference';
import {
  ANALYTICS_MEASUREMENT_ID,
  buildAnalyticsRequestUrl,
} from './lib/analytics-transport';

interface Ga4WebCollectionOptions {
  measurementId: string;
}

const ga4WebCollection =
  defineAnalyticsProvider<Ga4WebCollectionOptions>(
    (_analytics, _config, options) => {
      let eventSequence = 0;

      return {
        identify: () => Promise.resolve(),
        page: () => Promise.resolve(),
        track: async (event) => {
          eventSequence += 1;
          const url = buildAnalyticsRequestUrl(
            {
              name: event.event.name,
            },
            {
              clientId: event.user.id,
              eventSequence,
              measurementId: options.measurementId,
              sessionId:
                event.meta.sessionId ??
                Math.floor(event.meta.timestamp / 1000),
            },
          );

          await fetch(url, {
            credentials: 'omit',
            keepalive: true,
            method: 'GET',
            referrerPolicy: 'no-referrer',
          });
        },
      };
    },
  );

export default defineAppConfig({
  analytics: {
    enabled: analyticsEnabledStorage,
    providers: [
      ga4WebCollection({
        measurementId: ANALYTICS_MEASUREMENT_ID,
      }),
    ],
  },
});
