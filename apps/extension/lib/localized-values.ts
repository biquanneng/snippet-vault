// SPDX-License-Identifier: MPL-2.0

import {
  translate,
  type SupportedLocale,
  type TranslationKey,
} from './i18n-catalog';

const BUILT_IN_LABEL_KEYS = {
  ak: 'labels.accessKey',
  sk: 'labels.secretKey',
  password: 'labels.password',
  note: 'labels.note',
} as const satisfies Record<string, TranslationKey>;

const BUILT_IN_LABEL_ALIASES: Readonly<Record<string, readonly string[]>> = {
  ak: ['AK'],
  sk: ['SK'],
};

export type EnvironmentValue =
  | 'development'
  | 'test'
  | 'staging'
  | 'production';

interface EnvironmentDefinition {
  canonicalContext: string;
  translationKey: TranslationKey;
}

export const ENVIRONMENT_DEFINITIONS = {
  development: {
    canonicalContext: '开发环境',
    translationKey: 'environments.development',
  },
  test: {
    canonicalContext: '测试环境',
    translationKey: 'environments.test',
  },
  staging: {
    canonicalContext: '预发布环境',
    translationKey: 'environments.staging',
  },
  production: {
    canonicalContext: '生产环境',
    translationKey: 'environments.production',
  },
} as const satisfies Record<EnvironmentValue, EnvironmentDefinition>;

export function getLocalizedLabelName(
  id: string,
  storedName: string,
  locale: SupportedLocale,
): string {
  const key =
    BUILT_IN_LABEL_KEYS[id as keyof typeof BUILT_IN_LABEL_KEYS];
  return key ? translate(locale, key) : storedName;
}

export function getBuiltInLabelAliases(id: string): string[] {
  const key =
    BUILT_IN_LABEL_KEYS[id as keyof typeof BUILT_IN_LABEL_KEYS];
  return [
    ...(key ? uniqueTranslations(key) : []),
    ...(BUILT_IN_LABEL_ALIASES[id] ?? []),
  ];
}

export function getEnvironmentValue(
  context: string | undefined,
): EnvironmentValue | undefined {
  if (!context) {
    return undefined;
  }
  return (
    Object.entries(ENVIRONMENT_DEFINITIONS) as Array<
      [EnvironmentValue, EnvironmentDefinition]
    >
  ).find(([, definition]) => definition.canonicalContext === context)?.[0];
}

export function getLocalizedEnvironmentName(
  value: EnvironmentValue,
  locale: SupportedLocale,
): string {
  return translate(
    locale,
    ENVIRONMENT_DEFINITIONS[value].translationKey,
  );
}

export function getEnvironmentSearchAliases(
  context: string | undefined,
): string[] {
  const value = getEnvironmentValue(context);
  return value
    ? uniqueTranslations(
        ENVIRONMENT_DEFINITIONS[value].translationKey,
      )
    : [];
}

function uniqueTranslations(key: TranslationKey): string[] {
  return [...new Set([
    translate('en', key),
    translate('zh_CN', key),
  ])];
}
