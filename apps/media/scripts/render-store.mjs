/* SPDX-License-Identifier: MPL-2.0 */

import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import {
  getCompositionId,
  getContactSheetCompositionId,
  getScreenshotPath,
  storeLocales,
  storePromos,
  storeSlides,
} from "./store-manifest.mjs";

const localeArgumentIndex = process.argv.indexOf("--locale");
const requestedLocale =
  localeArgumentIndex === -1 ? null : process.argv[localeArgumentIndex + 1];

if (requestedLocale && !storeLocales.includes(requestedLocale)) {
  console.error(
    `Unsupported locale: ${requestedLocale}. Use en or zh-CN.`,
  );
  process.exit(1);
}

const selectedLocales = requestedLocale ? [requestedLocale] : storeLocales;
const missingInputs = selectedLocales.flatMap((locale) =>
  storeSlides
    .map((slide) => getScreenshotPath(locale, slide))
    .filter((assetPath) => !existsSync(resolve("public", assetPath))),
);

if (missingInputs.length > 0) {
  console.error("Chrome Web Store rendering requires these sanitized inputs:");
  for (const input of missingInputs) {
    console.error(`- public/${input}`);
  }
  process.exit(1);
}

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const renderStill = (compositionId, outputPath, props) => {
  mkdirSync(resolve(outputPath, ".."), { recursive: true });

  const result = spawnSync(
    pnpmCommand,
    [
      "exec",
      "remotion",
      "still",
      "src/index.ts",
      compositionId,
      outputPath,
      `--props=${JSON.stringify(props)}`,
    ],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

for (const locale of selectedLocales) {
  const screenshotPaths = {};

  for (const slide of storeSlides) {
    const screenshotPath = getScreenshotPath(locale, slide);
    screenshotPaths[slide.id] = screenshotPath;
    renderStill(
      getCompositionId(locale, slide),
      `output/chrome-store/${locale}/${slide.fileName}`,
      {
        locale,
        slideId: slide.id,
        screenshotPath,
      },
    );
  }

  renderStill(
    getContactSheetCompositionId(locale),
    `output/chrome-store/${locale}/contact-sheet.png`,
    { locale, screenshotPaths },
  );
}

for (const promo of storePromos) {
  renderStill(
    promo.id,
    `output/chrome-store/promo/${promo.fileName}`,
    {},
  );
}
