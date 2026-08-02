// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Toaster } from '../../components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import { toLanguageTag } from '../../lib/i18n-catalog';
import { applyThemeToElement } from '../../lib/theme';
import { useI18n } from '../../lib/use-i18n';
import { useThemePreference } from '../../lib/use-theme';
import { SearchPanelContent } from '../content/search/SearchPanelContent';
import { SettingsPage } from './SettingsPage';

type SidePanelPage = 'search' | 'settings';

export function App() {
  const { locale, t } = useI18n();
  const {
    preference: themePreference,
    resolvedTheme,
  } = useThemePreference();
  const [page, setPage] = useState<SidePanelPage>('search');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page === 'search') {
      inputRef.current?.focus();
    }
  }, [page]);

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
      className="flex h-dvh min-w-0 flex-col bg-background text-foreground"
      lang={toLanguageTag(locale)}
    >
      <h1 className="sr-only">SnippetVault</h1>
      {page === 'settings' ? (
        <SettingsPage onBack={() => setPage('search')} />
      ) : (
        <SearchPanelContent
          analyticsSurface="side_panel"
          inputRef={inputRef}
          capabilities={{
            enhancedCreate: true,
            filterControls: true,
            workspaceLifecycleActions: true,
          }}
          toolbarEnd={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPage('settings')}
                    aria-label={t('settings.open')}
                  >
                    <Settings2 aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  {t('settings.open')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />
      )}
      <Toaster
        richColors
        theme={resolvedTheme}
        className="pointer-events-auto"
      />
    </main>
  );
}
