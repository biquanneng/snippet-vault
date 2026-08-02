// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

import { DEFAULT_WORKSPACE_EXPIRY_DAYS } from './workspace-expiry';

export const workspaceExpiryDaysStorage = storage.defineItem<number>(
  'local:workspace-expiry-days',
  { fallback: DEFAULT_WORKSPACE_EXPIRY_DAYS },
);
