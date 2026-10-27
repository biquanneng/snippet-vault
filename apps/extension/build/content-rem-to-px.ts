// SPDX-License-Identifier: MPL-2.0

/**
 * The content-script UI lives in a Shadow DOM on arbitrary host pages, where
 * `rem` still resolves against the host's `<html>` font size. Pages that set
 * `html { font-size: 62.5% }` would shrink every Tailwind utility, so the
 * content stylesheet is compiled to fixed px. The side panel keeps `rem` so it
 * follows the user's browser font-size preference.
 */

const ROOT_FONT_SIZE_PX = 16;
const REM_PATTERN = /(?<![\w.-])(-?(?:\d+\.?\d*|\.\d+))rem\b/g;

export const CONTENT_STYLE_ENTRY = "/entrypoints/content/style.css";

export function remToPx(value: string): string {
  return value.replace(REM_PATTERN, (_, amount: string) => {
    const px = Number.parseFloat(amount) * ROOT_FONT_SIZE_PX;
    return `${Number(px.toFixed(4))}px`;
  });
}

interface CssDeclaration {
  value: string;
}

interface CssAtRule {
  params: string;
}

interface CssRoot {
  source?: { input?: { file?: string } };
  walkDecls(callback: (declaration: CssDeclaration) => void): void;
  walkAtRules(callback: (atRule: CssAtRule) => void): void;
}

export function contentRemToPx() {
  return {
    postcssPlugin: "snippet-vault-content-rem-to-px",
    Once(root: CssRoot) {
      const file = root.source?.input?.file?.replaceAll("\\", "/");
      if (!file?.endsWith(CONTENT_STYLE_ENTRY)) {
        return;
      }
      root.walkDecls((declaration) => {
        if (declaration.value.includes("rem")) {
          declaration.value = remToPx(declaration.value);
        }
      });
      // `@container` conditions resolve rem against the host root too.
      root.walkAtRules((atRule) => {
        if (atRule.params.includes("rem")) {
          atRule.params = remToPx(atRule.params);
        }
      });
    },
  };
}
