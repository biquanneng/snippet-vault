// SPDX-License-Identifier: MPL-2.0

import { Monitor, Moon, Sun } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import type { Translator } from '../../lib/i18n-catalog';
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from '../../lib/theme';
import { useI18n } from '../../lib/use-i18n';
import { useThemePreference } from '../../lib/use-theme';

export function ThemeSelect() {
  const { t } = useI18n();
  const { preference, setPreference } = useThemePreference();
  const label = getThemePreferenceLabel(preference, t);
  const ThemeIcon = getThemePreferenceIcon(preference);

  return (
    <Select
      value={preference}
      onValueChange={(value) => {
        if (!isThemePreference(value)) {
          return;
        }
        void setPreference(value).catch((error: unknown) => {
          console.error(
            '[SnippetVault] Failed to save the theme preference',
            error,
          );
        });
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-full max-w-48"
        aria-label={t('theme.label')}
        title={`${t('theme.label')}: ${label}`}
      >
        <ThemeIcon aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {THEME_PREFERENCES.map((value) => (
          <SelectItem key={value} value={value}>
            {getThemePreferenceLabel(value, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function isThemePreference(
  value: string,
): value is ThemePreference {
  return THEME_PREFERENCES.includes(
    value as ThemePreference,
  );
}

function getThemePreferenceLabel(
  preference: ThemePreference,
  t: Translator,
): string {
  if (preference === 'light') {
    return t('theme.light');
  }
  if (preference === 'dark') {
    return t('theme.dark');
  }
  return t('theme.system');
}

function getThemePreferenceIcon(
  preference: ThemePreference,
) {
  if (preference === 'light') {
    return Sun;
  }
  if (preference === 'dark') {
    return Moon;
  }
  return Monitor;
}
