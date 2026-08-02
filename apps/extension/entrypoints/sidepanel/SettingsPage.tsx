// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  LayoutGrid,
  SlidersHorizontal,
  Tags,
} from 'lucide-react';

import { Button } from '../../components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ContextPresetListData,
  type LabelListData,
} from '../../lib/browser/message-contract';
import { toIntlLocale, type Translator } from '../../lib/i18n-catalog';
import type { TranslationKey } from '../../lib/i18n-catalog';
import { useI18n } from '../../lib/use-i18n';
import { type ThemePreference } from '../../lib/theme';
import { useThemePreference } from '../../lib/use-theme';
import { getWorkspaceExpiryDays } from '../../lib/workspace-expiry';
import { GeneralSettings } from './GeneralSettings';
import { StorageSettings } from './StorageSettings';
import { TaxonomySettings } from './TaxonomySettings';
import { WorkspaceSettings } from './WorkspaceSettings';

type SettingsSectionId =
  | 'general'
  | 'workspace'
  | 'taxonomy'
  | 'storage';

interface SettingsPageProps {
  onBack: () => void;
}

interface SettingsMenuItem {
  id: SettingsSectionId;
  icon: typeof LayoutGrid;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  content: ComponentType;
}

interface SettingsSnapshot {
  workspaceExpiryDays: number | null;
  labelsCount: number | null;
  contextsCount: number | null;
}

const SETTINGS_MENU_ITEMS: readonly SettingsMenuItem[] = [
  {
    id: 'general',
    icon: SlidersHorizontal,
    titleKey: 'settings.menu.general.title',
    descriptionKey: 'settings.menu.general.description',
    content: GeneralSettings,
  },
  {
    id: 'workspace',
    icon: LayoutGrid,
    titleKey: 'settings.menu.workspace.title',
    descriptionKey: 'settings.menu.workspace.description',
    content: WorkspaceSettings,
  },
  {
    id: 'taxonomy',
    icon: Tags,
    titleKey: 'settings.menu.taxonomy.title',
    descriptionKey: 'settings.menu.taxonomy.description',
    content: TaxonomySettings,
  },
  {
    id: 'storage',
    icon: Database,
    titleKey: 'settings.menu.storage.title',
    descriptionKey: 'settings.menu.storage.description',
    content: StorageSettings,
  },
] as const;

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { locale, preference: languagePreference, t } = useI18n();
  const { preference: themePreference } = useThemePreference();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId | null>(null);
  const [snapshot, setSnapshot] = useState<SettingsSnapshot>({
    workspaceExpiryDays: null,
    labelsCount: null,
    contextsCount: null,
  });
  const activeItem = SETTINGS_MENU_ITEMS.find(
    (item) => item.id === activeSection,
  );
  const ActiveContent = activeItem?.content;
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(toIntlLocale(locale)),
    [locale],
  );

  useEffect(() => {
    let cancelled = false;

    void Promise.allSettled([
      getWorkspaceExpiryDays(),
      sendExtensionMessage<LabelListData>({
        type: MESSAGE_TYPE.getLabels,
      }),
      sendExtensionMessage<ContextPresetListData>({
        type: MESSAGE_TYPE.getContextPresets,
      }),
    ]).then(([workspaceExpiryResult, labelsResult, contextsResult]) => {
      if (cancelled) {
        return;
      }

      setSnapshot({
        workspaceExpiryDays:
          workspaceExpiryResult.status === 'fulfilled'
            ? workspaceExpiryResult.value
            : null,
        labelsCount:
          labelsResult.status === 'fulfilled' && labelsResult.value.ok
          ? labelsResult.value.data.labels.length
          : null,
        contextsCount:
          contextsResult.status === 'fulfilled' && contextsResult.value.ok
          ? contextsResult.value.data.contextPresets.length
          : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const menuSummaries = useMemo<Record<SettingsSectionId, string>>(
    () => ({
      general: [
        getThemePreferenceLabel(themePreference, t),
        getLanguagePreferenceLabel(languagePreference, t),
      ].join(' · '),
      workspace: formatSummaryParts([
        snapshot.workspaceExpiryDays === null
          ? null
          : `${numberFormatter.format(snapshot.workspaceExpiryDays)} ${t(
              'settings.workspace.days',
            )}`,
        snapshot.contextsCount === null
          ? null
          : `${numberFormatter.format(snapshot.contextsCount)} ${t(
              'settings.workspace.contextTitle',
            )}`,
      ]),
      taxonomy:
        snapshot.labelsCount === null
          ? t('settings.menu.taxonomy.title')
          : `${numberFormatter.format(snapshot.labelsCount)} ${t(
              'settings.storage.backupLabels',
            )}`,
      storage: `${t('settings.storage.active')} · .sv`,
    }),
    [
      languagePreference,
      numberFormatter,
      snapshot.contextsCount,
      snapshot.labelsCount,
      snapshot.workspaceExpiryDays,
      t,
      themePreference,
    ],
  );

  function goBack() {
    if (activeSection) {
      setActiveSection(null);
      return;
    }
    onBack();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 bg-background px-4 pt-3 pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={goBack}
                aria-label={
                  activeItem
                    ? t('settings.menu.back')
                    : t('settings.back')
                }
              >
                <ArrowLeft aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              {activeItem
                ? t('settings.menu.back')
                : t('settings.back')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold">
            {activeItem
              ? t(activeItem.titleKey)
              : t('settings.title')}
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {activeItem
              ? t(activeItem.descriptionKey)
              : t('settings.description')}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {ActiveContent ? (
          <ActiveContent />
        ) : (
          <nav
            aria-label={t('settings.menu.label')}
            className="space-y-1 p-2"
          >
            {SETTINGS_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                  onClick={() => setActiveSection(item.id)}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">
                        {t(item.titleKey)}
                      </span>
                      <span
                        className="max-w-28 shrink-0 truncate text-right text-xs text-muted-foreground"
                        title={menuSummaries[item.id]}
                      >
                        {menuSummaries[item.id]}
                      </span>
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {t(item.descriptionKey)}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

function formatSummaryParts(
  parts: readonly (string | null)[],
): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
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

function getLanguagePreferenceLabel(
  preference: 'system' | 'en' | 'zh_CN',
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
