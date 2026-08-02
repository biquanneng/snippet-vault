// SPDX-License-Identifier: MPL-2.0

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { ThemePreference } from './theme';

const preferenceStorage = vi.hoisted(() => {
  let value: ThemePreference = 'system';
  let watcher:
    | ((
        nextValue: ThemePreference,
        oldValue: ThemePreference,
      ) => void)
    | undefined;
  let nextWrite:
    | ((nextValue: ThemePreference) => Promise<void>)
    | undefined;

  return {
    getValue: vi.fn(async () => value),
    setValue: vi.fn(async (nextValue: ThemePreference) => {
      const write = nextWrite;
      nextWrite = undefined;
      await write?.(nextValue);
      const oldValue = value;
      value = nextValue;
      watcher?.(nextValue, oldValue);
    }),
    watch: vi.fn(
      (
        callback: (
          nextValue: ThemePreference,
          oldValue: ThemePreference,
        ) => void,
      ) => {
        watcher = callback;
        return () => {
          watcher = undefined;
        };
      },
    ),
    emit(nextValue: ThemePreference) {
      const oldValue = value;
      value = nextValue;
      watcher?.(nextValue, oldValue);
    },
    interceptNextWrite(
      write: (nextValue: ThemePreference) => Promise<void>,
    ) {
      nextWrite = write;
    },
  };
});

vi.mock('./theme-preference', () => ({
  themePreferenceStorage: preferenceStorage,
}));

import {
  getThemeSnapshot,
  initializeTheme,
  normalizeThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
} from './theme';

describe('runtime theme preference', () => {
  let systemThemeMatches = false;
  let notifySystemTheme:
    | ((event: MediaQueryListEvent) => void)
    | undefined;

  beforeAll(() => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => ({
        get matches() {
          return systemThemeMatches;
        },
        addEventListener: (
          _event: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          notifySystemTheme = listener;
        },
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('follows the system, persists overrides, and reconciles failed writes', async () => {
    await initializeTheme();
    expect(getThemeSnapshot()).toEqual({
      preference: 'system',
      resolvedTheme: 'light',
    });

    const listener = vi.fn();
    const unsubscribe = subscribeTheme(listener);

    systemThemeMatches = true;
    notifySystemTheme?.({ matches: true } as MediaQueryListEvent);
    expect(getThemeSnapshot()).toEqual({
      preference: 'system',
      resolvedTheme: 'dark',
    });

    await setThemePreference('light');
    expect(preferenceStorage.setValue).toHaveBeenCalledWith('light');
    expect(getThemeSnapshot()).toEqual({
      preference: 'light',
      resolvedTheme: 'light',
    });

    systemThemeMatches = false;
    notifySystemTheme?.({ matches: false } as MediaQueryListEvent);
    expect(getThemeSnapshot()).toEqual({
      preference: 'light',
      resolvedTheme: 'light',
    });

    preferenceStorage.emit('system');
    expect(getThemeSnapshot()).toEqual({
      preference: 'system',
      resolvedTheme: 'light',
    });

    await setThemePreference('dark');
    let rejectWrite: ((reason?: unknown) => void) | undefined;
    preferenceStorage.interceptNextWrite(
      () =>
        new Promise((_, reject) => {
          rejectWrite = reject;
        }),
    );
    const failedWrite = setThemePreference('light');
    expect(getThemeSnapshot()).toEqual({
      preference: 'light',
      resolvedTheme: 'light',
    });

    await vi.waitFor(() => {
      expect(rejectWrite).toBeTypeOf('function');
    });
    rejectWrite?.(new Error('simulated theme write failure'));
    await expect(failedWrite).rejects.toThrow(
      'simulated theme write failure',
    );
    expect(getThemeSnapshot()).toEqual({
      preference: 'dark',
      resolvedTheme: 'dark',
    });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });

  it('normalizes unknown values and resolves explicit themes', () => {
    expect(normalizeThemePreference('sepia')).toBe('system');
    expect(normalizeThemePreference('dark')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('light', 'dark')).toBe('light');
  });
});
