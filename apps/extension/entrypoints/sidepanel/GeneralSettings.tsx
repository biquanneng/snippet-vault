// SPDX-License-Identifier: MPL-2.0

import {
  ChartNoAxesCombined,
  EyeOff,
  Languages,
  Palette,
} from 'lucide-react';

import { useI18n } from '../../lib/use-i18n';
import { AnalyticsPreference } from './AnalyticsPreference';
import { LanguageSelect } from './LanguageSelect';
import { SelectionTooltipSuppressionSettings } from './SelectionTooltipSuppressionSettings';
import { SettingsBlock } from './SettingsBlock';
import { ThemeSelect } from './ThemeSelect';

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
