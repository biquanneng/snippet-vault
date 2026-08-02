// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

import type { ThemePreference } from './theme';

export const themePreferenceStorage =
  storage.defineItem<ThemePreference>(
    'local:theme-preference',
    { fallback: 'system' },
  );
