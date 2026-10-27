// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

/** A UI preference: it is not part of backups. */
export const onboardingSeenStorage = storage.defineItem<boolean>(
  'local:onboarding-seen',
  { fallback: false },
);

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    return (await onboardingSeenStorage.getValue()) === true;
  } catch (error: unknown) {
    console.error('[SnippetVault] Failed to read the onboarding state', error);
    // Never block the panel on a guide that cannot be tracked.
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await onboardingSeenStorage.setValue(true);
  } catch (error: unknown) {
    console.error('[SnippetVault] Failed to save the onboarding state', error);
  }
}
