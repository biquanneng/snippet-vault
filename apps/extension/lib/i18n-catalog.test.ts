// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  messagesByLocale,
  normalizeLanguagePreference,
  normalizeLocale,
  resolveLocale,
  translate,
} from './i18n-catalog';

describe('i18n catalogs', () => {
  it('keeps the English and Chinese key sets aligned', () => {
    expect(flattenKeys(messagesByLocale.zh_CN)).toEqual(
      flattenKeys(messagesByLocale.en),
    );
  });

  it('normalizes browser and stored locale values to two locales', () => {
    expect(normalizeLocale('zh-CN')).toBe('zh_CN');
    expect(normalizeLocale('zh_TW')).toBe('zh_CN');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('en');

    expect(normalizeLanguagePreference('zh_CN')).toBe('zh_CN');
    expect(normalizeLanguagePreference('en')).toBe('en');
    expect(normalizeLanguagePreference('fr')).toBe('system');
    expect(resolveLocale('system', 'zh-HK')).toBe('zh_CN');
    expect(resolveLocale('system', 'de-DE')).toBe('en');
  });

  it('supports substitutions and English singular/plural forms', () => {
    expect(
      translate('en', 'search.pagination.total', ['1'], 1),
    ).toBe('1 record');
    expect(
      translate('en', 'search.pagination.total', ['12'], 12),
    ).toBe('12 records');
    expect(
      translate('zh_CN', 'search.pagination.total', ['12'], 12),
    ).toBe('12 条记录');
  });
});

function flattenKeys(value: Record<string, unknown>): string[] {
  const keys: string[] = [];

  function visit(
    current: Record<string, unknown>,
    prefix = '',
  ): void {
    for (const [key, child] of Object.entries(current)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'string') {
        keys.push(path);
      } else if (child && typeof child === 'object') {
        visit(child as Record<string, unknown>, path);
      }
    }
  }

  visit(value);
  return keys.sort();
}
