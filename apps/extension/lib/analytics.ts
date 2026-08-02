// SPDX-License-Identifier: MPL-2.0

import { analytics } from '#analytics';

import type { AnalyticsEvent } from './analytics-events';

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  void analytics.track(event.name);
}
