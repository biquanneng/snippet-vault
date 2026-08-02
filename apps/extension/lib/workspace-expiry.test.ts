// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKSPACE_EXPIRY_DAYS,
  MIN_WORKSPACE_EXPIRY_DAYS,
  normalizeWorkspaceExpiryDays,
  WORKSPACE_EXPIRY_DAY_MS,
  workspaceExpiryDaysToMs,
} from './workspace-expiry';

describe('workspace expiry preference', () => {
  it('defaults new temporary records to seven days', () => {
    expect(DEFAULT_WORKSPACE_EXPIRY_DAYS).toBe(7);
    expect(workspaceExpiryDaysToMs(DEFAULT_WORKSPACE_EXPIRY_DAYS)).toBe(
      7 * 24 * 60 * 60 * 1_000,
    );
  });

  it('accepts whole day counts from one day and rejects unsafe values', () => {
    expect(normalizeWorkspaceExpiryDays(MIN_WORKSPACE_EXPIRY_DAYS)).toBe(1);
    expect(normalizeWorkspaceExpiryDays(30)).toBe(30);

    for (const value of [0, -1, 1.5, Number.NaN, '7', null]) {
      expect(normalizeWorkspaceExpiryDays(value)).toBe(
        DEFAULT_WORKSPACE_EXPIRY_DAYS,
      );
    }
  });

  it('converts configured days to milliseconds', () => {
    expect(workspaceExpiryDaysToMs(3)).toBe(3 * WORKSPACE_EXPIRY_DAY_MS);
  });
});
