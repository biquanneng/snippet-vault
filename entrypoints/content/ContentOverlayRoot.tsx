// SPDX-License-Identifier: MPL-2.0

import { useState } from "react";
import sonnerStyles from "sonner/dist/styles.css?inline";

import { Toaster } from "../../components/ui/sonner";
import { SelectionTooltip } from "./SelectionTooltip";
import { SearchPanel } from "./search/SearchPanel";
import { useDoubleShiftShortcut } from "./search/use-double-shift-shortcut";

interface ContentOverlayRootProps {
  portalContainer: HTMLElement;
}

export function ContentOverlayRoot({
  portalContainer,
}: ContentOverlayRootProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useDoubleShiftShortcut(() => setSearchOpen(true), !searchOpen);

  return (
    <>
      <style data-snippet-vault-sonner-styles="true">{sonnerStyles}</style>
      <Toaster richColors className="pointer-events-auto" />
      {searchOpen ? null : (
        <SelectionTooltip portalContainer={portalContainer} />
      )}
      {searchOpen ? (
        <SearchPanel
          portalContainer={portalContainer}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}
    </>
  );
}
