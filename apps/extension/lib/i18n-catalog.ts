// SPDX-License-Identifier: MPL-2.0

import en from '../locales/en.json';
import zhCN from '../locales/zh_CN.json';

export type SupportedLocale = 'en' | 'zh_CN';
export type LanguagePreference = 'system' | SupportedLocale;

type Messages = Record<string, unknown>;
type LeafPath<T> = {
  [Key in keyof T & string]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${LeafPath<T[Key]>}`
      : never;
}[keyof T & string];

export type TranslationKey = LeafPath<typeof en>;
export type TranslationSubstitution = string | number;
export type Translator = (
  key: TranslationKey,
  substitutions?: readonly TranslationSubstitution[],
  count?: number,
) => string;

export const messagesByLocale = {
  en,
  zh_CN: zhCN,
} satisfies Record<SupportedLocale, Messages>;

export function normalizeLocale(locale: string): SupportedLocale {
  return locale.toLowerCase().replace('_', '-').startsWith('zh')
    ? 'zh_CN'
    : 'en';
}

export function normalizeLanguagePreference(
  preference: unknown,
): LanguagePreference {
  return preference === 'en' || preference === 'zh_CN'
    ? preference
    : 'system';
}

export function resolveLocale(
  preference: LanguagePreference,
  browserLocale: string,
): SupportedLocale {
  return preference === 'system'
    ? normalizeLocale(browserLocale)
    : preference;
}

export function toIntlLocale(locale: SupportedLocale): string {
  return locale === 'zh_CN' ? 'zh-CN' : 'en-US';
}

export function toLanguageTag(locale: SupportedLocale): string {
  return locale === 'zh_CN' ? 'zh-CN' : 'en';
}

export const translate: (
  locale: SupportedLocale,
  key: TranslationKey,
  substitutions?: readonly TranslationSubstitution[],
  count?: number,
) => string = (locale, key, substitutions, count) => {
  const message =
    getMessage(messagesByLocale[locale], key) ??
    getMessage(messagesByLocale.en, key) ??
    key;
  const pluralForms = message.split(' | ');
  const selectedMessage =
    count === undefined || pluralForms.length === 1
      ? message
      : pluralForms[count === 1 ? 0 : pluralForms.length - 1];

  return selectedMessage.replace(/\$(\d+)/g, (match, index: string) => {
    const substitution = substitutions?.[Number(index) - 1];
    return substitution === undefined ? match : String(substitution);
  });
};

function getMessage(
  messages: Messages,
  key: TranslationKey,
): string | undefined {
  let value: unknown = messages;
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Messages)[part];
  }
  return typeof value === 'string' ? value : undefined;
}
