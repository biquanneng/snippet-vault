// SPDX-License-Identifier: MPL-2.0

import { useEffect } from 'react';

import { OnboardingGuide } from '../../components/onboarding/OnboardingGuide';
import { Button } from '../../components/ui/button';
import { toLanguageTag } from '../../lib/i18n-catalog';
import { applyThemeToElement } from '../../lib/theme';
import { useI18n } from '../../lib/use-i18n';
import { useThemePreference } from '../../lib/use-theme';

/** Opened once in a new tab right after the extension is installed. */
export function App() {
  const { locale, t } = useI18n();
  const { preference, resolvedTheme } = useThemePreference();

  useEffect(() => {
    document.documentElement.lang = toLanguageTag(locale);
    document.title = t('onboarding.title');
  }, [locale, t]);

  useEffect(() => {
    applyThemeToElement(document.documentElement, {
      preference,
      resolvedTheme,
    });
  }, [preference, resolvedTheme]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-16">
      <h1 className="px-5 text-2xl font-semibold">{t('onboarding.title')}</h1>
      <OnboardingGuide
        actions={(
          <Button
            type="button"
            size="lg"
            className="px-5"
            autoFocus
            onClick={() => window.close()}
          >
            {t('onboarding.done')}
          </Button>
        )}
      />
    </main>
  );
}
