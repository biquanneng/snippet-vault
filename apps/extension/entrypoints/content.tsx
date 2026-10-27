// SPDX-License-Identifier: MPL-2.0

import ReactDOM from "react-dom/client";

import "./content/style.css";
import { registerBrandFonts } from "../lib/brand-font";
import { registerPageSourceResponder } from "../lib/browser/page-source";
import { initializeLanguage } from "../lib/i18n";
import {
  getSelectionTooltipSuppressionPreferences,
} from "../lib/selection-tooltip-suppression-storage";
import {
  applyThemeToElement,
  getThemeSnapshot,
  initializeTheme,
} from "../lib/theme";
import { ContentOverlayRoot } from "./content/ContentOverlayRoot";
import {
  createContentLayer,
  raiseContentLayer,
} from "./content/content-top-layer";
import { CONTENT_UI_SHADOW_CSS } from "./content/content-ui-boundary";

declare global {
  interface Window {
    /** The mounted instance's context; a stale one is invalid after update. */
    __snippetVaultContentContext__?: { readonly isInvalid: boolean };
    /** Set by the background right before it injects this script on demand. */
    __snippetVaultOpenPanelOnMount__?: boolean;
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    const mounted = window.__snippetVaultContentContext__;
    if (mounted && !mounted.isInvalid) {
      return;
    }
    window.__snippetVaultContentContext__ = ctx;
    const openPanelOnMount = window.__snippetVaultOpenPanelOnMount__ === true;
    window.__snippetVaultOpenPanelOnMount__ = false;
    // Shadow roots can only use fonts registered on the document.
    registerBrandFonts();
    ctx.onInvalidated(registerPageSourceResponder());
    const [, , initialSuppressionPreferences] = await Promise.all([
      initializeLanguage(),
      initializeTheme(),
      getSelectionTooltipSuppressionPreferences().catch(() => null),
    ]);

    const ui = await createShadowRootUi(ctx, {
      name: "snippet-vault-tooltip",
      position: "overlay",
      anchor: "body",
      css: CONTENT_UI_SHADOW_CSS,
      onMount(container) {
        // Every surface, including Radix portals, lives in one top-layer
        // element so host-page stacking contexts cannot cover it.
        const layer = createContentLayer(document);
        applyThemeToElement(layer, getThemeSnapshot());
        const app = document.createElement("div");
        app.dataset.snippetVaultUi = "true";
        app.className = "contents";
        layer.append(app);
        container.append(layer);
        raiseContentLayer(layer);

        const root = ReactDOM.createRoot(app);
        root.render(
          <ContentOverlayRoot
            portalContainer={layer}
            initialSuppressionPreferences={initialSuppressionPreferences}
            initialSearchOpen={openPanelOnMount}
            subscribeToLocationChanges={(listener) => {
              let subscribed = true;
              ctx.addEventListener(
                window,
                "wxt:locationchange",
                () => {
                  if (subscribed) {
                    listener();
                  }
                },
              );
              return () => {
                subscribed = false;
              };
            }}
          />,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
        if (window.__snippetVaultContentContext__ === ctx) {
          window.__snippetVaultContentContext__ = undefined;
        }
      },
    });

    ui.mount();
  },
});
