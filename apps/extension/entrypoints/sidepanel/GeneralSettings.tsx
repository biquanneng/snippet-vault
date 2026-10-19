// SPDX-License-Identifier: MPL-2.0

import {
  ChartNoAxesCombined,
  EyeOff,
  Keyboard,
  Languages,
  Palette,
  Zap,
} from 'lucide-react';

import { Kbd, KbdGroup } from '../../components/ui/kbd';
import { useI18n } from '../../lib/use-i18n';
import { AnalyticsPreference } from './AnalyticsPreference';
import { LanguageSelect } from './LanguageSelect';
import { QuickSaveTargetSelect } from './QuickSaveTargetSelect';
import { SelectionTooltipSuppressionSettings } from './SelectionTooltipSuppressionSettings';
import { SettingsBlock } from './SettingsBlock';
import { ThemeSelect } from './ThemeSelect';
import { WorkspaceSettings } from './WorkspaceSettings';

export function GeneralSettings() {
  const { t } = useI18n();

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
        title={t('settings.shortcuts.title')}
        description={t('settings.shortcuts.description')}
      >
        <dl className="divide-y divide-border border-y">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="min-w-0 text-xs font-medium">
              {t('settings.shortcuts.openSearch')}
            </dt>
            <dd className="shrink-0">
              <KbdGroup aria-label={t('settings.shortcuts.doubleShiftLabel')}>
                <Kbd>Shift</Kbd>
                <Kbd>Shift</Kbd>
              </KbdGroup>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="min-w-0 pt-0.5 text-xs font-medium">
              {t('settings.shortcuts.openSelectionTooltip')}
            </dt>
            <dd className="shrink-0 space-y-1.5">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">macOS</span>
                <KbdGroup aria-label={t('settings.shortcuts.macosCopyLabel')}>
                  <Kbd>⌘</Kbd>
                  <Kbd>C</Kbd>
                  <Kbd>C</Kbd>
                </KbdGroup>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  Windows / Linux
                </span>
                <KbdGroup
                  aria-label={t('settings.shortcuts.windowsCopyLabel')}
                >
                  <Kbd>Ctrl</Kbd>
                  <Kbd>C</Kbd>
                  <Kbd>C</Kbd>
                </KbdGroup>
              </div>
            </dd>
          </div>
        </dl>
      </SettingsBlock>

      <SettingsBlock
        icon={Zap}
        title={t('settings.quickSave.title')}
        description={t('settings.quickSave.description')}
      >
        <QuickSaveTargetSelect />
      </SettingsBlock>

      <WorkspaceSettings />

      <SettingsBlock
        icon={EyeOff}
        title={t('settings.selectionTooltipSuppression.title')}
        description={t(
          'settings.selectionTooltipSuppression.description',
        )}
      >
        <SelectionTooltipSuppressionSettings />
      </SettingsBlock>

      <SettingsBlock
        icon={ChartNoAxesCombined}
        title={t('settings.analytics.title')}
        description={t('settings.analytics.description')}
      >
        <AnalyticsPreference />
      </SettingsBlock>
    </div>
  );
}
