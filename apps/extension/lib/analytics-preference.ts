// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

export const ANALYTICS_HOST_PERMISSION =
  'https://www.google-analytics.com/*';

export const analyticsEnabledStorage = storage.defineItem<boolean>(
  'local:analytics-enabled',
  { fallback: false },
);
