/* SPDX-License-Identifier: MPL-2.0 */

export const storeLocales = ["en", "zh-CN"];

export const storeSlides = [
  {
    id: "search",
    fileName: "01-search.png",
    compositionSuffix: "01-Search",
  },
  {
    id: "capture",
    fileName: "02-capture.png",
    compositionSuffix: "02-Capture",
  },
  {
    id: "in-page-search",
    fileName: "03-in-page-search.png",
    compositionSuffix: "03-InPageSearch",
  },
  {
    id: "temporary-workspace",
    fileName: "04-temporary-workspace.png",
    compositionSuffix: "04-TemporaryWorkspace",
  },
  {
    id: "local-backup",
    fileName: "05-local-backup.png",
    compositionSuffix: "05-LocalBackup",
  },
];

export const getLocaleCode = (locale) => (locale === "en" ? "EN" : "ZH");

export const getCompositionId = (locale, slide) =>
  `Store-${getLocaleCode(locale)}-${slide.compositionSuffix}`;

export const getContactSheetCompositionId = (locale) =>
  `Store-${getLocaleCode(locale)}-ContactSheet`;

export const storePromos = [
  {
    id: "Store-SmallPromo",
    fileName: "small-promo.png",
    width: 440,
    height: 280,
  },
  {
    id: "Store-MarqueePromo",
    fileName: "marquee.png",
    width: 1400,
    height: 560,
  },
];

export const getScreenshotPath = (locale, slide) =>
  `screenshots/chrome-store/${locale}/${slide.fileName}`;
