// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  searchSubmitted,
  snippetSaved,
  surfaceOpened,
  workspaceActionCompleted,
} from './analytics-events';

describe('analytics event contract', () => {
  it('contains only fixed surface and record-kind metadata', () => {
    expect(surfaceOpened('side_panel')).toEqual({
      name: 'surface_opened',
      properties: { surface: 'side_panel' },
    });
    expect(searchSubmitted('in_page_search', 'workspace')).toEqual({
      name: 'search_submitted',
      properties: {
        surface: 'in_page_search',
        kind: 'workspace',
      },
    });
    expect(snippetSaved('selection_tooltip', 'vault', 'create')).toEqual({
      name: 'snippet_saved',
      properties: {
        surface: 'selection_tooltip',
        kind: 'vault',
        action: 'create',
      },
    });
  });

  it('maps workspace actions without item identifiers or expiry data', () => {
    expect(workspaceActionCompleted('side_panel', 'extended')).toEqual({
      name: 'workspace_extended',
      properties: { surface: 'side_panel' },
    });
    expect(workspaceActionCompleted('side_panel', 'promoted')).toEqual({
      name: 'workspace_promoted',
      properties: { surface: 'side_panel' },
    });
  });
});
