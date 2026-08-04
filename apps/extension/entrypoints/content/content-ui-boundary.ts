// SPDX-License-Identifier: MPL-2.0

/**
 * Keep WXT's non-visual shadow-root scaffolding out of host-page hit testing.
 * Interactive SnippetVault surfaces opt back in with `pointer-events-auto`.
 *
 * The declaration must be important because WXT prepends
 * `:host { all: initial !important; }` to every isolated UI root.
 */
export const CONTENT_UI_SHADOW_CSS = `
:host,
html,
body {
  pointer-events: none !important;
}
`;
