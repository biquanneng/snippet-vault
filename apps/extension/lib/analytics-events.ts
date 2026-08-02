// SPDX-License-Identifier: MPL-2.0

export const ANALYTICS_SURFACES = [
  'side_panel',
  'in_page_search',
  'selection_tooltip',
] as const;

export type AnalyticsSurface =
  (typeof ANALYTICS_SURFACES)[number];

export type AnalyticsEvent =
  | {
      name: 'surface_opened';
      properties: { surface: AnalyticsSurface };
    }
  | {
      name: 'search_submitted';
      properties: {
        surface: Exclude<AnalyticsSurface, 'selection_tooltip'>;
        kind: 'vault' | 'workspace';
      };
    }
  | {
      name: 'snippet_saved';
      properties: {
        surface: AnalyticsSurface;
        kind: 'vault' | 'workspace';
        action: 'create' | 'edit';
      };
    }
  | {
      name: 'workspace_extended' | 'workspace_promoted';
      properties: {
        surface: Exclude<AnalyticsSurface, 'selection_tooltip'>;
      };
    };

export function surfaceOpened(
  surface: AnalyticsSurface,
): AnalyticsEvent {
  return {
    name: 'surface_opened',
    properties: { surface },
  };
}

export function searchSubmitted(
  surface: Exclude<AnalyticsSurface, 'selection_tooltip'>,
  kind: 'vault' | 'workspace',
): AnalyticsEvent {
  return {
    name: 'search_submitted',
    properties: { surface, kind },
  };
}

export function snippetSaved(
  surface: AnalyticsSurface,
  kind: 'vault' | 'workspace',
  action: 'create' | 'edit',
): AnalyticsEvent {
  return {
    name: 'snippet_saved',
    properties: { surface, kind, action },
  };
}

export function workspaceActionCompleted(
  surface: Exclude<AnalyticsSurface, 'selection_tooltip'>,
  action: 'extended' | 'promoted',
): AnalyticsEvent {
  return {
    name:
      action === 'extended'
        ? 'workspace_extended'
        : 'workspace_promoted',
    properties: { surface },
  };
}
