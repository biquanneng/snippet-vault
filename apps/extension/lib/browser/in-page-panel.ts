// SPDX-License-Identifier: MPL-2.0

/** Background → content script: open the in-page search panel. */
export const OPEN_IN_PAGE_PANEL_MESSAGE = 'snippet-vault/open-in-page-panel';
/** Content script → background: open the settings side panel. */
export const OPEN_SETTINGS_MESSAGE = 'snippet-vault/open-settings';
/** `storage.session` key telling the side panel why it was opened. */
export const UNSUPPORTED_PAGE_NOTICE_KEY = 'unsupportedPageNotice';

// Browsers refuse script injection on their extension galleries even though
// they are ordinary https pages.
const BLOCKED_HOSTS = new Set([
  'chromewebstore.google.com',
  'microsoftedge.microsoft.com',
  'addons.mozilla.org',
]);

/**
 * Decides synchronously, from the clicked tab's URL, whether the in-page panel
 * can run there. It must stay synchronous: `sidePanel.open` only works inside
 * the action click's user gesture, so the fallback cannot wait for an attempt.
 */
export function canHostInPagePanel(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (BLOCKED_HOSTS.has(parsed.hostname)) {
      return false;
    }
    return !(
      parsed.hostname === 'chrome.google.com' &&
      parsed.pathname.startsWith('/webstore')
    );
  } catch {
    return false;
  }
}

export function isMessageOfType(message: unknown, type: string): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === type
  );
}
