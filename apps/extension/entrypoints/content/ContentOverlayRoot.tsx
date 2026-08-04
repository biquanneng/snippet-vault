// SPDX-License-Identifier: MPL-2.0

import { useCallback, useEffect, useState } from "react";
import sonnerStyles from "sonner/dist/styles.css?inline";

import { Toaster } from "../../components/ui/sonner";
import { trackAnalyticsEvent } from "../../lib/analytics";
import { openInPageSearch } from "../../lib/analytics-events";
import { toLanguageTag } from "../../lib/i18n-catalog";
import { applyThemeToElement } from "../../lib/theme";
import { useI18n } from "../../lib/use-i18n";
import { useThemePreference } from "../../lib/use-theme";
import {
  createSelectionTooltipSuppressionRule,
  isSelectionTooltipSuppressed,
  type SelectionTooltipSuppressionPreferences,
  type SelectionTooltipSuppressionRule,
  type SelectionTooltipSuppressionScope,
} from "../../lib/selection-tooltip-suppression";
import {
  deleteSelectionTooltipSuppressionRule,
  getSelectionTooltipSuppressionPreferences,
  suppressSelectionTooltipForUrl,
  watchSelectionTooltipSuppressionPreferences,
} from "../../lib/selection-tooltip-suppression-storage";
import { SelectionTooltip } from "./SelectionTooltip";
import { SearchPanel } from "./search/SearchPanel";
import { useDoubleShiftShortcut } from "./search/use-double-shift-shortcut";

interface ContentOverlayRootProps {
  portalContainer: HTMLElement;
  initialSuppressionPreferences: SelectionTooltipSuppressionPreferences | null;
  subscribeToLocationChanges: (listener: () => void) => () => void;
}

export function ContentOverlayRoot({
  portalContainer,
  initialSuppressionPreferences,
  subscribeToLocationChanges,
}: ContentOverlayRootProps) {
  const { locale } = useI18n();
  const {
    preference: themePreference,
    resolvedTheme,
  } = useThemePreference();
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(() => window.location.href);
  const [suppressionPreferences, setSuppressionPreferences] =
    useState<SelectionTooltipSuppressionPreferences | null>(
      initialSuppressionPreferences,
    );

  const openSearch = useCallback(() => {
    trackAnalyticsEvent(openInPageSearch());
    setSearchOpen(true);
  }, []);

  useDoubleShiftShortcut(openSearch, !searchOpen);

  useEffect(() => {
    let cancelled = false;
    let preferenceRevision = 0;
    const unwatchPreferences =
      watchSelectionTooltipSuppressionPreferences((preferences) => {
        preferenceRevision += 1;
        if (!cancelled) {
          setSuppressionPreferences(preferences);
        }
      });
    const readRevision = preferenceRevision;

    void getSelectionTooltipSuppressionPreferences()
      .then((preferences) => {
        if (!cancelled && preferenceRevision === readRevision) {
          setSuppressionPreferences(preferences);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && preferenceRevision === readRevision) {
          console.error(
            "[SnippetVault] Failed to read selection tooltip exceptions",
            error,
          );
        }
      });

    const unsubscribeLocationChanges = subscribeToLocationChanges(() => {
      if (!cancelled) {
        setCurrentUrl(window.location.href);
      }
    });

    return () => {
      cancelled = true;
      unwatchPreferences();
      unsubscribeLocationChanges();
    };
  }, [subscribeToLocationChanges]);

  useEffect(() => {
    applyThemeToElement(portalContainer, {
      preference: themePreference,
      resolvedTheme,
    });
  }, [portalContainer, resolvedTheme, themePreference]);

  const suppressTooltip = useCallback(
    async (
      scope: SelectionTooltipSuppressionScope,
    ): Promise<SelectionTooltipSuppressionRule> => {
      const { preferences, rule } =
        await suppressSelectionTooltipForUrl(scope, window.location.href);
      setSuppressionPreferences(preferences);
      return rule;
    },
    [],
  );

  const restoreTooltip = useCallback(
    async (rule: SelectionTooltipSuppressionRule): Promise<void> => {
      const preferences =
        await deleteSelectionTooltipSuppressionRule(rule);
      setSuppressionPreferences(preferences);
    },
    [],
  );

  const tooltipSuppressed = suppressionPreferences
    ? isSelectionTooltipSuppressed(suppressionPreferences, currentUrl)
    : true;
  const canSuppressSite =
    createSelectionTooltipSuppressionRule("site", currentUrl) !== null;

  return (
    <div className="contents" lang={toLanguageTag(locale)}>
      <style data-snippet-vault-sonner-styles="true">{sonnerStyles}</style>
      <Toaster
        richColors
        theme={resolvedTheme}
        className="pointer-events-auto"
      />
      {searchOpen || tooltipSuppressed ? null : (
        <SelectionTooltip
          portalContainer={portalContainer}
          canSuppressSite={canSuppressSite}
          onSuppress={suppressTooltip}
          onRestoreSuppression={restoreTooltip}
        />
      )}
      {searchOpen ? (
        <SearchPanel
          portalContainer={portalContainer}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
