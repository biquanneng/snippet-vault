// SPDX-License-Identifier: MPL-2.0

import { useEffect, useState } from "react";
import sonnerStyles from "sonner/dist/styles.css?inline";

import { Toaster } from "../../components/ui/sonner";
import { toLanguageTag } from "../../lib/i18n-catalog";
import { applyThemeToElement } from "../../lib/theme";
import { useI18n } from "../../lib/use-i18n";
import { useThemePreference } from "../../lib/use-theme";
import { SelectionTooltip } from "./SelectionTooltip";
import { SearchPanel } from "./search/SearchPanel";
import { useDoubleShiftShortcut } from "./search/use-double-shift-shortcut";

interface ContentOverlayRootProps {
  portalContainer: HTMLElement;
}

export function ContentOverlayRoot({
  portalContainer,
}: ContentOverlayRootProps) {
  const { locale } = useI18n();
  const {
    preference: themePreference,
    resolvedTheme,
  } = useThemePreference();
  const [searchOpen, setSearchOpen] = useState(false);

  useDoubleShiftShortcut(() => setSearchOpen(true), !searchOpen);

  useEffect(() => {
    applyThemeToElement(portalContainer, {
      preference: themePreference,
      resolvedTheme,
    });
  }, [portalContainer, resolvedTheme, themePreference]);

  return (
    <div className="contents" lang={toLanguageTag(locale)}>
      <style data-snippet-vault-sonner-styles="true">{sonnerStyles}</style>
      <Toaster
        richColors
        theme={resolvedTheme}
        className="pointer-events-auto"
      />
      {searchOpen ? null : (
        <SelectionTooltip portalContainer={portalContainer} />
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
