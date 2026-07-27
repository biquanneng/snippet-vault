// SPDX-License-Identifier: MPL-2.0

import { useState, type ComponentType } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Database,
  LayoutGrid,
  SlidersHorizontal,
  Tags,
} from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import type { TranslationKey } from '../../lib/i18n-catalog';
import { useI18n } from '../../lib/use-i18n';
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
  planned?: boolean;
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
    planned: true,
  },
] as const;

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId | null>(null);
  const activeItem = SETTINGS_MENU_ITEMS.find(
    (item) => item.id === activeSection,
  );
  const ActiveContent = activeItem?.content;

  function goBack() {
    if (activeSection) {
      setActiveSection(null);
      return;
    }
    onBack();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 border-b bg-background px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={goBack}
          aria-label={
            activeItem ? t('settings.menu.back') : t('settings.back')
          }
          title={
            activeItem ? t('settings.menu.back') : t('settings.back')
          }
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
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
            className="divide-y"
          >
            {SETTINGS_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
                  onClick={() => setActiveSection(item.id)}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    aria-hidden="true"
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {t(item.titleKey)}
                      {item.planned ? (
                        <Badge
                          variant="secondary"
                          className="rounded-md font-normal"
                        >
                          {t('settings.menu.planned')}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
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
