// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  canHostInPagePanel,
  isMessageOfType,
  OPEN_IN_PAGE_PANEL_MESSAGE,
} from './in-page-panel';

describe('in-page panel hosting', () => {
  it('accepts ordinary web pages', () => {
    expect(canHostInPagePanel('https://console.example.com/keys')).toBe(true);
    expect(canHostInPagePanel('http://localhost:3000/')).toBe(true);
  });

  it('rejects pages where the browser forbids content scripts', () => {
    expect(canHostInPagePanel(undefined)).toBe(false);
    expect(canHostInPagePanel('chrome://newtab/')).toBe(false);
    expect(canHostInPagePanel('chrome-extension://abc/sidepanel.html')).toBe(false);
    expect(canHostInPagePanel('file:///Users/me/notes.txt')).toBe(false);
    expect(canHostInPagePanel('https://chromewebstore.google.com/detail/x')).toBe(false);
    expect(canHostInPagePanel('https://chrome.google.com/webstore/detail/x')).toBe(false);
    expect(canHostInPagePanel('not a url')).toBe(false);
  });

  it('matches messages by type only', () => {
    expect(
      isMessageOfType({ type: OPEN_IN_PAGE_PANEL_MESSAGE }, OPEN_IN_PAGE_PANEL_MESSAGE),
    ).toBe(true);
    expect(isMessageOfType({ type: 'other' }, OPEN_IN_PAGE_PANEL_MESSAGE)).toBe(false);
    expect(isMessageOfType(null, OPEN_IN_PAGE_PANEL_MESSAGE)).toBe(false);
  });
});
