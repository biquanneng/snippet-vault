// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  getOpenSearchSidePanelShortcut,
  OPEN_SEARCH_SIDE_PANEL_COMMAND,
} from './side-panel-shortcut';

describe('side panel search shortcut', () => {
  it('returns the active shortcut for the search command', () => {
    expect(
      getOpenSearchSidePanelShortcut([
        { name: 'other-command', shortcut: 'Ctrl+Shift+J' },
        {
          name: OPEN_SEARCH_SIDE_PANEL_COMMAND,
          shortcut: 'Ctrl+Shift+K',
        },
      ]),
    ).toBe('Ctrl+Shift+K');
  });

  it('returns null when Chrome has not assigned a shortcut', () => {
    expect(
      getOpenSearchSidePanelShortcut([
        {
          name: OPEN_SEARCH_SIDE_PANEL_COMMAND,
          shortcut: '',
        },
      ]),
    ).toBeNull();
    expect(getOpenSearchSidePanelShortcut([])).toBeNull();
  });
});
