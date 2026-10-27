// SPDX-License-Identifier: MPL-2.0

import { Languages } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import type {
  LanguagePreference,
  Translator,
} from '../../lib/i18n-catalog';
import { useI18n } from '../../lib/use-i18n';

const LANGUAGE_PREFERENCES: LanguagePreference[] = [
  'system',
  'en',
  'zh_CN',
];

export function LanguageSelect() {
  const { preference, setPreference, t } = useI18n();

  return (
    <Select
      value={preference}
      onValueChange={(value) => {
        if (!isLanguagePreference(value)) {
          return;
        }
        void setPreference(value).catch((error: unknown) => {
          console.error(
            '[SnippetVault] Failed to save the language preference',
            error,
          );
        });
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-full max-w-48"
        aria-label={t('language.label')}
        title={t('language.label')}
      >
        <Languages aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {LANGUAGE_PREFERENCES.map((value) => (
          <SelectItem key={value} value={value}>
            {getLanguagePreferenceLabel(value, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function isLanguagePreference(
  value: string,
): value is LanguagePreference {
  return LANGUAGE_PREFERENCES.includes(
    value as LanguagePreference,
  );
}

function getLanguagePreferenceLabel(
  preference: LanguagePreference,
  t: Translator,
): string {
  if (preference === 'en') {
    return t('language.english');
  }
  if (preference === 'zh_CN') {
    return t('language.chinese');
  }
  return t('language.system');
}
