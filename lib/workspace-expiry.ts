// SPDX-License-Identifier: MPL-2.0

export const WORKSPACE_EXPIRY_DAY_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_WORKSPACE_EXPIRY_DAYS = 7;
export const MIN_WORKSPACE_EXPIRY_DAYS = 1;
export const MAX_WORKSPACE_EXPIRY_DAYS = Math.floor(
  Number.MAX_SAFE_INTEGER / WORKSPACE_EXPIRY_DAY_MS,
);

export function normalizeWorkspaceExpiryDays(value: unknown): number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= MIN_WORKSPACE_EXPIRY_DAYS &&
    value <= MAX_WORKSPACE_EXPIRY_DAYS
    ? value
    : DEFAULT_WORKSPACE_EXPIRY_DAYS;
}

export function workspaceExpiryDaysToMs(days: unknown): number {
  return normalizeWorkspaceExpiryDays(days) * WORKSPACE_EXPIRY_DAY_MS;
}

export async function getWorkspaceExpiryDays(): Promise<number> {
  try {
    const { workspaceExpiryDaysStorage } =
      await import('./workspace-expiry-storage');
    return normalizeWorkspaceExpiryDays(
      await workspaceExpiryDaysStorage.getValue(),
    );
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Failed to read the workspace expiry preference',
      error,
    );
    return DEFAULT_WORKSPACE_EXPIRY_DAYS;
  }
}

export async function setWorkspaceExpiryDays(
  days: number,
): Promise<void> {
  if (normalizeWorkspaceExpiryDays(days) !== days) {
    throw new RangeError('Invalid workspace expiry day count');
  }

  const { workspaceExpiryDaysStorage } =
    await import('./workspace-expiry-storage');
  await workspaceExpiryDaysStorage.setValue(days);
}
