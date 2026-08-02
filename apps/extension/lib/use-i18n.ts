// SPDX-License-Identifier: MPL-2.0

import { useCallback, useSyncExternalStore } from 'react';

import {
  getI18nSnapshot,
  setUiLanguagePreference,
  subscribeI18n,
} from './i18n';
import {
  translate,
  type TranslationKey,
  type TranslationSubstitution,
} from './i18n-catalog';

export function useI18n() {
  const snapshot = useSyncExternalStore(
    subscribeI18n,
    getI18nSnapshot,
    getI18nSnapshot,
  );
  const t = useCallback(
    (
      key: TranslationKey,
      substitutions?: readonly TranslationSubstitution[],
      count?: number,
    ) => translate(snapshot.locale, key, substitutions, count),
    [snapshot.locale],
  );

  return {
    ...snapshot,
    setPreference: setUiLanguagePreference,
    t,
  };
}
