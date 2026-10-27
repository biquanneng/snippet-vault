// SPDX-License-Identifier: MPL-2.0

import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

import { contentRemToPx } from "./build/content-rem-to-px";

const flexSearchPersistentBundle = fileURLToPath(
  new URL(
    "./node_modules/flexsearch/dist/flexsearch.bundle.module.min.mjs",
    import.meta.url,
  ),
);

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: [
    "@wxt-dev/auto-icons",
    "@wxt-dev/module-react",
    "@wxt-dev/i18n/module",
    "@wxt-dev/analytics/module",
  ],
  webExt: {
    disabled: true,
  },
  autoIcons: {
    sizes: [16, 32, 48, 96, 128],
  },
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    homepage_url: "https://github.com/biquanneng/snippet-vault",
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsP7+yPlOHj40nGkiU7ItxVbOkt+1rxLcPlU0nWE5qTEYeypOxKVFewONLB2XtiBdj9IuNvO33jUxFi9mO4E8Sgm/y6B7z4c+ooZIw66Zf7aZlIscRiJbMAk4UrvalM2aH7TmP8AxV/oT6gl8hCKfIgqqTa/838OOcv9Z7F+c0qPqua8D9H0/9lgX040IbUAMlfXW1C/Ov7tshUgmM1SaYt42fcCVS7Ye9d3v17sILNG8cv1CY/CsOfSwr1/OZfZliG3zDUfmbmtDyK8BhYrHmElH9iSTrKvJnXcAXu/KwxOnQS7a/eh9otIFM7kKfBje7Fsl/ybKSJuXTs1RVszSsQIDAQAB",
    // activeTab + scripting inject the in-page panel into tabs that were
    // open before install/update, when the toolbar or command is invoked.
    permissions: ["storage", "activeTab", "scripting"],
    commands: {
      "open-search-panel": {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "__MSG_commandOpenSearch__",
      },
    },
    optional_host_permissions: ["https://www.google-analytics.com/*"],
    action: {
      default_title: "__MSG_actionTitle__",
    },
    // Settings live in the side panel; this is the fallback when
    // `sidePanel.open` is refused and the browser's "Options" menu entry.
    options_ui: {
      page: "sidepanel.html",
      open_in_tab: true,
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
    css: {
      postcss: {
        plugins: [contentRemToPx()],
      },
    },
    resolve: {
      alias: [
        {
          find: /^flexsearch$/,
          replacement: flexSearchPersistentBundle,
        },
      ],
    },
  }),
});
