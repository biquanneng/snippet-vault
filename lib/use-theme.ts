// SPDX-License-Identifier: MPL-2.0

import { useSyncExternalStore } from 'react';

import {
  getThemeSnapshot,
  setThemePreference,
  subscribeTheme,
} from './theme';

export function useThemePreference() {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeSnapshot,
  );

  return {
    ...snapshot,
    setPreference: setThemePreference,
  };
}
