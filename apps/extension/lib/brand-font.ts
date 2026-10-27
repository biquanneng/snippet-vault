// SPDX-License-Identifier: MPL-2.0

import interLatinDataUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?inline';
import jetBrainsMonoLatinDataUrl from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline';

/**
 * Inter (UI text) and JetBrains Mono (snippet content, code, keys, URLs),
 * both SIL OFL 1.1, ship inside the bundle so every surface renders the same
 * on any OS and host page, without a network request.
 *
 * They are registered through `document.fonts` from bytes rather than a CSS
 * `@font-face`: shadow roots ignore their own `@font-face` rules, a
 * `chrome-extension:` URL would have to be web-accessible (and probe-able by
 * sites), and a `data:` URL is blocked by strict host `font-src` CSPs.
 * Only the Latin subsets are bundled; CJK falls back to the system stack.
 */
export const BRAND_FONT_FAMILY = 'SnippetVault Inter';
export const BRAND_MONO_FONT_FAMILY = 'SnippetVault JetBrains Mono';

const LATIN_UNICODE_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const BRAND_FONTS = [
  { family: BRAND_FONT_FAMILY, dataUrl: interLatinDataUrl, weight: '100 900' },
  { family: BRAND_MONO_FONT_FAMILY, dataUrl: jetBrainsMonoLatinDataUrl, weight: '100 800' },
] as const;

export function registerBrandFonts(fonts: FontFaceSet = document.fonts): void {
  const registered = new Set<string>();
  for (const face of fonts) {
    registered.add(face.family);
  }

  for (const { family, dataUrl, weight } of BRAND_FONTS) {
    if (registered.has(family)) {
      continue;
    }

    const face = new FontFace(family, decodeDataUrl(dataUrl), {
      weight,
      style: 'normal',
      display: 'swap',
      unicodeRange: LATIN_UNICODE_RANGE,
    });
    fonts.add(face);
    void face.load().catch((error: unknown) => {
      console.error(`[SnippetVault] Failed to load the bundled font ${family}`, error);
    });
  }
}

function decodeDataUrl(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
