// SPDX-License-Identifier: MPL-2.0

import interLatinDataUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline';

/**
 * Inter (SIL OFL 1.1) ships inside the bundle so every surface renders the
 * same on any OS and host page, without a network request.
 *
 * It is registered through `document.fonts` from bytes rather than a CSS
 * `@font-face`: shadow roots ignore their own `@font-face` rules, a
 * `chrome-extension:` URL would have to be web-accessible (and probe-able by
 * sites), and a `data:` URL is blocked by strict host `font-src` CSPs.
 * Only the Latin subset is bundled; CJK falls back to the system stack.
 */
export const BRAND_FONT_FAMILY = 'SnippetVault Inter';

const LATIN_UNICODE_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export function registerBrandFont(fonts: FontFaceSet = document.fonts): void {
  for (const face of fonts) {
    if (face.family === BRAND_FONT_FAMILY) {
      return;
    }
  }

  const face = new FontFace(BRAND_FONT_FAMILY, decodeDataUrl(interLatinDataUrl), {
    weight: '100 900',
    style: 'normal',
    display: 'swap',
    unicodeRange: LATIN_UNICODE_RANGE,
  });
  fonts.add(face);
  void face.load().catch((error: unknown) => {
    console.error('[SnippetVault] Failed to load the bundled font', error);
  });
}

function decodeDataUrl(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
