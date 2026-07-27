// SPDX-License-Identifier: MPL-2.0

export const OPEN_SEARCH_SIDE_PANEL_COMMAND =
  'open-search-side-panel';
export const CHROME_EXTENSION_SHORTCUTS_URL =
  'chrome://extensions/shortcuts';

interface ExtensionCommandSummary {
  name?: string;
  shortcut?: string;
}

export function getOpenSearchSidePanelShortcut(
  commands: readonly ExtensionCommandSummary[],
): string | null {
  const shortcut = commands
    .find(
      (command) =>
        command.name === OPEN_SEARCH_SIDE_PANEL_COMMAND,
    )
    ?.shortcut?.trim();

  return shortcut || null;
}
