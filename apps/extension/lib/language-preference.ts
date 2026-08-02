// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

import type { LanguagePreference } from './i18n-catalog';

export const languagePreferenceStorage =
  storage.defineItem<LanguagePreference>(
    'local:language-preference',
    { fallback: 'system' },
  );
