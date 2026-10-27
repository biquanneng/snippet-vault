// SPDX-License-Identifier: MPL-2.0

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Database,
  Lightbulb,
  PocketKnife,
  SlidersHorizontal,
  Star,
  Tags,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type LabelListData,
} from "../../lib/browser/message-contract";
import { toIntlLocale, type Translator } from "../../lib/i18n-catalog";
import type { TranslationKey } from "../../lib/i18n-catalog";
import { useI18n } from "../../lib/use-i18n";
import { type ThemePreference } from "../../lib/theme";
import { useThemePreference } from "../../lib/use-theme";
import { getWorkspaceExpiryDays } from "../../lib/workspace-expiry";
import { GeneralSettings } from "./GeneralSettings";
import { GuideSettings } from "./GuideSettings";
import { StorageSettings } from "./StorageSettings";
import { TaxonomySettings } from "./TaxonomySettings";
import { ToolsSettings } from "./ToolsSettings";

type SettingsSectionId = "tools" | "general" | "taxonomy" | "storage" | "guide";

interface SettingsMenuItem {
  id: SettingsSectionId;
  icon: typeof SlidersHorizontal;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  content: ComponentType;
}

interface SettingsSnapshot {
  workspaceExpiryDays: number | null;
  labelsCount: number | null;
}

const SETTINGS_MENU_ITEMS: readonly SettingsMenuItem[] = [
  {
    id: "tools",
    icon: PocketKnife,
    titleKey: "settings.menu.tools.title",
    descriptionKey: "settings.menu.tools.description",
    content: ToolsSettings,
  },
  {
    id: "general",
    icon: SlidersHorizontal,
    titleKey: "settings.menu.general.title",
    descriptionKey: "settings.menu.general.description",
    content: GeneralSettings,
  },
  {
    id: "taxonomy",
    icon: Tags,
    titleKey: "settings.menu.taxonomy.title",
    descriptionKey: "settings.menu.taxonomy.description",
    content: TaxonomySettings,
  },
  {
    id: "storage",
    icon: Database,
    titleKey: "settings.menu.storage.title",
    descriptionKey: "settings.menu.storage.description",
    content: StorageSettings,
  },
  {
    id: "guide",
    icon: Lightbulb,
    titleKey: "settings.menu.guide.title",
    descriptionKey: "settings.menu.guide.description",
    content: GuideSettings,
  },
] as const;

// Plain link only: fetching the live star count would add a network request
// to a local-first extension.
const REPOSITORY_URL = "https://github.com/biquanneng/snippet-vault";

export function SettingsPage() {
  const { locale, preference: languagePreference, t } = useI18n();
  const { preference: themePreference } = useThemePreference();
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(
    null,
  );
  const [snapshot, setSnapshot] = useState<SettingsSnapshot>({
    workspaceExpiryDays: null,
    labelsCount: null,
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
    ]).then(([workspaceExpiryResult, labelsResult]) => {
      if (cancelled) {
        return;
      }

      setSnapshot({
        workspaceExpiryDays:
          workspaceExpiryResult.status === "fulfilled"
            ? workspaceExpiryResult.value
            : null,
        labelsCount:
          labelsResult.status === "fulfilled" && labelsResult.value.ok
            ? labelsResult.value.data.labels.length
            : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const menuSummaries = useMemo<Record<SettingsSectionId, string>>(
    () => ({
      general: formatSummaryParts([
        getThemePreferenceLabel(themePreference, t),
        getLanguagePreferenceLabel(languagePreference, t),
        snapshot.workspaceExpiryDays === null
          ? null
          : `${numberFormatter.format(snapshot.workspaceExpiryDays)} ${t(
              "settings.workspace.days",
            )}`,
      ]),
      taxonomy:
        snapshot.labelsCount === null
          ? t("settings.menu.taxonomy.title")
          : `${numberFormatter.format(snapshot.labelsCount)} ${t(
              "settings.storage.backupLabels",
            )}`,
      storage: `${t("settings.storage.active")} · .sv`,
      tools: "JSON",
      guide: "",
    }),
    [
      languagePreference,
      numberFormatter,
      snapshot.labelsCount,
      snapshot.workspaceExpiryDays,
      t,
      themePreference,
    ],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-start gap-3 bg-background px-4 pt-3 pb-2">
        {activeItem ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setActiveSection(null)}
            aria-label={t("settings.menu.back")}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold">
            {activeItem ? t(activeItem.titleKey) : t("settings.title")}
          </h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {activeItem
              ? t(activeItem.descriptionKey)
              : t("settings.description")}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {ActiveContent ? (
          <ActiveContent />
        ) : (
          <nav aria-label={t("settings.menu.label")} className="space-y-1 p-2">
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
        {ActiveContent ? null : (
          <footer className="flex items-center justify-center gap-1.5 px-4 pt-2 pb-4 text-xs text-muted-foreground">
            <span>{t("settings.menu.sourceCode")}</span>
            <span aria-hidden="true">·</span>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Star className="size-3.5" aria-hidden="true" />
              {t("settings.menu.star")}
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

function formatSummaryParts(parts: readonly (string | null)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

function getThemePreferenceLabel(
  preference: ThemePreference,
  t: Translator,
): string {
  if (preference === "light") {
    return t("theme.light");
  }
  if (preference === "dark") {
    return t("theme.dark");
  }
  return t("theme.system");
}

function getLanguagePreferenceLabel(
  preference: "system" | "en" | "zh_CN",
  t: Translator,
): string {
  if (preference === "en") {
    return t("language.english");
  }
  if (preference === "zh_CN") {
    return t("language.chinese");
  }
  return t("language.system");
}
