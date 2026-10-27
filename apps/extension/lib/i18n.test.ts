// SPDX-License-Identifier: MPL-2.0

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { LanguagePreference } from './i18n-catalog';

const preferenceStorage = vi.hoisted(() => {
  let value: LanguagePreference = 'system';
  let watcher:
    | ((
        nextValue: LanguagePreference,
        oldValue: LanguagePreference,
      ) => void)
    | undefined;
  let nextWrite:
    | ((nextValue: LanguagePreference) => Promise<void>)
    | undefined;

  return {
    getValue: vi.fn(async () => value),
    setValue: vi.fn(async (nextValue: LanguagePreference) => {
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
          nextValue: LanguagePreference,
          oldValue: LanguagePreference,
        ) => void,
      ) => {
        watcher = callback;
        return () => {
          watcher = undefined;
        };
      },
    ),
    emit(nextValue: LanguagePreference) {
      const oldValue = value;
      value = nextValue;
      watcher?.(nextValue, oldValue);
    },
    interceptNextWrite(
      write: (nextValue: LanguagePreference) => Promise<void>,
    ) {
      nextWrite = write;
    },
  };
});

vi.mock('./language-preference', () => ({
  languagePreferenceStorage: preferenceStorage,
}));

import {
  getI18nSnapshot,
  initializeLanguage,
  setUiLanguagePreference,
  subscribeI18n,
} from './i18n';

describe('runtime language preference', () => {
  beforeAll(() => {
    vi.stubGlobal('browser', {
      i18n: {
        getUILanguage: () => 'zh-CN',
      },
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('initializes from browser language and reacts to local and external changes', async () => {
    await initializeLanguage();
    expect(getI18nSnapshot()).toEqual({
      preference: 'system',
      locale: 'zh_CN',
    });

    const listener = vi.fn();
    const unsubscribe = subscribeI18n(listener);

    await setUiLanguagePreference('en');
    expect(preferenceStorage.setValue).toHaveBeenCalledWith('en');
    expect(getI18nSnapshot()).toEqual({
      preference: 'en',
      locale: 'en',
    });

    preferenceStorage.emit('zh_CN');
    expect(getI18nSnapshot()).toEqual({
      preference: 'zh_CN',
      locale: 'zh_CN',
    });
    expect(listener).toHaveBeenCalledTimes(2);

    let rejectEarlierWrite:
      | ((reason?: unknown) => void)
      | undefined;
    preferenceStorage.interceptNextWrite(
      () => new Promise((_, reject) => {
        rejectEarlierWrite = reject;
      }),
    );
    const earlierWrite = setUiLanguagePreference('en');
    const laterWrite = setUiLanguagePreference('zh_CN');
    expect(getI18nSnapshot()).toEqual({
      preference: 'zh_CN',
      locale: 'zh_CN',
    });

    await vi.waitFor(() => {
      expect(rejectEarlierWrite).toBeTypeOf('function');
    });
    rejectEarlierWrite?.(new Error('simulated older write failure'));
    await expect(earlierWrite).rejects.toThrow(
      'simulated older write failure',
    );
    await laterWrite;
    expect(getI18nSnapshot()).toEqual({
      preference: 'zh_CN',
      locale: 'zh_CN',
    });

    await setUiLanguagePreference('en');
    let rejectLocalWrite:
      | ((reason?: unknown) => void)
      | undefined;
    preferenceStorage.interceptNextWrite(
      () => new Promise((_, reject) => {
        rejectLocalWrite = reject;
      }),
    );
    const localWrite = setUiLanguagePreference('zh_CN');
    preferenceStorage.emit('system');
    expect(getI18nSnapshot().preference).toBe('zh_CN');

    await vi.waitFor(() => {
      expect(rejectLocalWrite).toBeTypeOf('function');
    });
    rejectLocalWrite?.(new Error('simulated local write failure'));
    await expect(localWrite).rejects.toThrow(
      'simulated local write failure',
    );
    expect(getI18nSnapshot()).toEqual({
      preference: 'system',
      locale: 'zh_CN',
    });

    unsubscribe();
  });
});
