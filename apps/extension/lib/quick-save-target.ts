// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

export const QUICK_SAVE_TARGETS = ['workspace', 'vault'] as const;
export type QuickSaveTarget = (typeof QUICK_SAVE_TARGETS)[number];
export const DEFAULT_QUICK_SAVE_TARGET: QuickSaveTarget = 'workspace';

/** A UI preference: it is not part of backups. */
export const quickSaveTargetStorage = storage.defineItem<QuickSaveTarget>(
  'local:quick-save-target',
  { fallback: DEFAULT_QUICK_SAVE_TARGET },
);

export function normalizeQuickSaveTarget(value: unknown): QuickSaveTarget {
  return QUICK_SAVE_TARGETS.includes(value as QuickSaveTarget)
    ? (value as QuickSaveTarget)
    : DEFAULT_QUICK_SAVE_TARGET;
}

export async function getQuickSaveTarget(): Promise<QuickSaveTarget> {
  try {
    return normalizeQuickSaveTarget(await quickSaveTargetStorage.getValue());
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Failed to read the quick save target preference',
      error,
    );
    return DEFAULT_QUICK_SAVE_TARGET;
  }
}
