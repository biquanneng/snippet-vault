/* SPDX-License-Identifier: MPL-2.0 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  storeLocales,
  storePromos,
  storeSlides,
} from "./store-manifest.mjs";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const readPngDimensions = (filePath) => {
  const contents = readFileSync(filePath);

  if (
    contents.length < 24 ||
    !contents.subarray(0, pngSignature.length).equals(pngSignature)
  ) {
    throw new Error(`${filePath} is not a valid PNG file.`);
  }

  return {
    width: contents.readUInt32BE(16),
    height: contents.readUInt32BE(20),
  };
};

const assertDimensions = (relativePath, expectedWidth, expectedHeight) => {
  const filePath = resolve(relativePath);
  const dimensions = readPngDimensions(filePath);

  if (
    dimensions.width !== expectedWidth ||
    dimensions.height !== expectedHeight
  ) {
    throw new Error(
      `${relativePath} is ${dimensions.width}x${dimensions.height}; expected ${expectedWidth}x${expectedHeight}.`,
    );
  }

  console.log(`OK ${relativePath} (${expectedWidth}x${expectedHeight})`);
};

for (const locale of storeLocales) {
  for (const slide of storeSlides) {
    assertDimensions(
      `output/chrome-store/${locale}/${slide.fileName}`,
      1280,
      800,
    );
  }

  assertDimensions(
    `output/chrome-store/${locale}/contact-sheet.png`,
    1920,
    900,
  );
}

for (const promo of storePromos) {
  assertDimensions(
    `output/chrome-store/promo/${promo.fileName}`,
    promo.width,
    promo.height,
  );
}
