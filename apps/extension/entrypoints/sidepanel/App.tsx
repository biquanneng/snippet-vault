// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Toaster } from '../../components/ui/sonner';
import { UNSUPPORTED_PAGE_NOTICE_KEY } from '../../lib/browser/in-page-panel';
import { toLanguageTag } from '../../lib/i18n-catalog';
import { applyThemeToElement } from '../../lib/theme';
import { useI18n } from '../../lib/use-i18n';
import { useThemePreference } from '../../lib/use-theme';
import { SettingsPage } from './SettingsPage';

/**
 * The side panel only hosts settings. Searching and creating happen in the
 * in-page panel, so the panel opens here for the pages that cannot host it.
 */
export function App() {
  const { locale, t } = useI18n();
  const {
    preference: themePreference,
    resolvedTheme,
  } = useThemePreference();
  const unsupportedPage = useUnsupportedPageNotice();

  useEffect(() => {
    document.documentElement.lang = toLanguageTag(locale);
  }, [locale]);

  useEffect(() => {
    applyThemeToElement(document.documentElement, {
      preference: themePreference,
      resolvedTheme,
    });
  }, [resolvedTheme, themePreference]);

  return (
    <main
      className="mx-auto flex h-dvh w-full max-w-xl min-w-0 flex-col bg-background text-foreground"
      lang={toLanguageTag(locale)}
    >
      <h1 className="sr-only">SnippetVault</h1>
      {unsupportedPage.visible ? (
        <div className="shrink-0 px-3 pt-3">
          <Alert>
            <Info aria-hidden="true" />
            <AlertTitle>{t('settings.unsupportedPage.title')}</AlertTitle>
            <AlertDescription>
              {t('settings.unsupportedPage.description')}
            </AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={unsupportedPage.dismiss}
                aria-label={t('settings.unsupportedPage.dismiss')}
              >
                <X aria-hidden="true" />
              </Button>
            </AlertAction>
          </Alert>
        </div>
      ) : null}
      <SettingsPage />
      <Toaster
        richColors
        theme={resolvedTheme}
        className="pointer-events-auto"
      />
    </main>
  );
}

function useUnsupportedPageNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const session = browser.storage.session;
    void session.get(UNSUPPORTED_PAGE_NOTICE_KEY).then((values) => {
      setVisible(values[UNSUPPORTED_PAGE_NOTICE_KEY] === true);
    });
    // The background writes the key just after opening the panel, so it may
    // arrive after the first read.
    const handleChange = (
      changes: Record<string, Browser.storage.StorageChange>,
    ) => {
      const change = changes[UNSUPPORTED_PAGE_NOTICE_KEY];
      if (change) {
        setVisible(change.newValue === true);
      }
    };
    session.onChanged.addListener(handleChange);
    return () => session.onChanged.removeListener(handleChange);
  }, []);

  return {
    visible,
    dismiss: () => {
      setVisible(false);
      void browser.storage.session.set({ [UNSUPPORTED_PAGE_NOTICE_KEY]: false });
    },
  };
}
