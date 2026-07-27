// SPDX-License-Identifier: MPL-2.0

import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink,
  Keyboard,
  Languages,
  Palette,
  RefreshCw,
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Kbd } from '../../components/ui/kbd';
import {
  CHROME_EXTENSION_SHORTCUTS_URL,
  getOpenSearchSidePanelShortcut,
} from '../../lib/browser/side-panel-shortcut';
import { useI18n } from '../../lib/use-i18n';
import { LanguageSelect } from './LanguageSelect';
import { SettingsBlock } from './SettingsBlock';
import { ThemeSelect } from './ThemeSelect';

export function GeneralSettings() {
  const { t } = useI18n();
  const [shortcut, setShortcut] = useState<string | null>(null);
  const [shortcutLoading, setShortcutLoading] = useState(true);
  const [shortcutError, setShortcutError] =
    useState<string | null>(null);

  const loadShortcut = useCallback(async () => {
    setShortcutLoading(true);
    setShortcutError(null);
    try {
      setShortcut(
        getOpenSearchSidePanelShortcut(
          await browser.commands.getAll(),
        ),
      );
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to load the search shortcut',
        error,
      );
      setShortcutError(t('settings.shortcut.loadFailed'));
    } finally {
      setShortcutLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadShortcut();
  }, [loadShortcut]);

  async function openShortcutSettings() {
    setShortcutError(null);
    try {
      await browser.tabs.create({
        url: CHROME_EXTENSION_SHORTCUTS_URL,
      });
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to open Chrome shortcut settings',
        error,
      );
      setShortcutError(t('settings.shortcut.openFailed'));
    }
  }

  return (
    <div className="px-4 pb-8">
      <SettingsBlock
        icon={Palette}
        title={t('settings.appearance.title')}
        description={t('settings.appearance.description')}
      >
        <ThemeSelect />
      </SettingsBlock>

      <SettingsBlock
        icon={Languages}
        title={t('settings.language.title')}
        description={t('settings.language.description')}
      >
        <LanguageSelect />
      </SettingsBlock>

      <SettingsBlock
        icon={Keyboard}
        title={t('settings.shortcut.title')}
        description={t('settings.shortcut.description')}
      >
        <div className="space-y-3">
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
            aria-busy={shortcutLoading}
            aria-live="polite"
          >
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">
                {t('settings.shortcut.current')}
              </p>
              <Kbd className="max-w-full">
                {shortcutLoading
                  ? t('settings.shortcut.loading')
                  : shortcut ??
                    t('settings.shortcut.unassigned')}
              </Kbd>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void loadShortcut()}
              disabled={shortcutLoading}
              aria-label={t('settings.shortcut.refresh')}
              title={t('settings.shortcut.refresh')}
            >
              <RefreshCw
                aria-hidden="true"
                className={shortcutLoading ? 'animate-spin' : ''}
              />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void openShortcutSettings()}
          >
            {t('settings.shortcut.change')}
            <ExternalLink aria-hidden="true" />
          </Button>

          {shortcutError ? (
            <p className="text-xs text-destructive" role="alert">
              {shortcutError}
            </p>
          ) : null}
        </div>
      </SettingsBlock>
    </div>
  );
}
