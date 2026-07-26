// SPDX-License-Identifier: MPL-2.0

import ReactDOM from "react-dom/client";

import "../assets/globals.css";
import { ContentOverlayRoot } from "./content/ContentOverlayRoot";

declare global {
  interface Window {
    __snippetVaultContentMounted__?: boolean;
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    if (window.__snippetVaultContentMounted__) {
      return;
    }
    window.__snippetVaultContentMounted__ = true;

    const ui = await createShadowRootUi(ctx, {
      name: "snippet-vault-tooltip",
      position: "overlay",
      anchor: "body",
      onMount(container) {
        const app = document.createElement("div");
        app.dataset.snippetVaultUi = "true";
        app.className = "pointer-events-none fixed inset-0 z-50";
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(<ContentOverlayRoot portalContainer={container} />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
        window.__snippetVaultContentMounted__ = false;
      },
    });

    ui.mount();
  },
});
