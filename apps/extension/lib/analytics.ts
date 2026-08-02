// SPDX-License-Identifier: MPL-2.0

import type { AnalyticsEvent } from './analytics-events';
import {
  ANALYTICS_HOST_PERMISSION,
  analyticsClientIdStorage,
  analyticsEnabledStorage,
} from './analytics-preference';
import { buildAnalyticsRequestUrl } from './analytics-transport';

const analyticsSessionId = Math.floor(Date.now() / 1000);

let analyticsEventSequence = 0;
let clientIdPromise: Promise<string> | undefined;

function generateClientId(): string {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);
  return `${Date.now()}.${randomValue[0]}`;
}

async function getClientId(): Promise<string> {
  clientIdPromise ??= (async () => {
    const storedClientId = await analyticsClientIdStorage.getValue();
    if (storedClientId) {
      return storedClientId;
    }

    const clientId = generateClientId();
    await analyticsClientIdStorage.setValue(clientId);
    return clientId;
  })();

  return clientIdPromise;
}

function getScreenResolution(): string | undefined {
  if (typeof screen === 'undefined' || !screen.width || !screen.height) {
    return undefined;
  }
  return `${screen.width}x${screen.height}`;
}

async function sendAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  if (!(await analyticsEnabledStorage.getValue())) {
    return;
  }

  const hasHostPermission = await browser.permissions.contains({
    origins: [ANALYTICS_HOST_PERMISSION],
  });
  if (!hasHostPermission) {
    return;
  }

  analyticsEventSequence += 1;
  const url = buildAnalyticsRequestUrl(event, {
    clientId: await getClientId(),
    eventSequence: analyticsEventSequence,
    extensionVersion: browser.runtime.getManifest().version,
    language:
      typeof navigator === 'undefined' ? undefined : navigator.language,
    screenResolution: getScreenResolution(),
    sessionId: analyticsSessionId,
  });

  await fetch(url, {
    credentials: 'omit',
    keepalive: true,
    method: 'GET',
    mode: 'no-cors',
    referrerPolicy: 'no-referrer',
  });
}

export function trackAnalyticsEvent(event: AnalyticsEvent): void {
  void sendAnalyticsEvent(event).catch(() => {
    // Analytics is best-effort and must never interrupt product actions.
  });
}
