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
  'environment:development': 'environments.development',
  'environment:test': 'environments.test',
  'environment:staging': 'environments.staging',
  'environment:production': 'environments.production',
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
    ...Object.entries(ENVIRONMENT_DEFINITIONS).flatMap(([env, definition]) =>
      id === `environment:${env}` ? [definition.canonicalContext] : [],
    ),
  ];
}

function uniqueTranslations(key: TranslationKey): string[] {
  return [...new Set([
    translate('en', key),
    translate('zh_CN', key),
  ])];
}
