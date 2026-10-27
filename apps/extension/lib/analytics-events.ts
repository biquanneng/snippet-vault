// SPDX-License-Identifier: MPL-2.0

export type AnalyticsEvent =
  | { name: 'open_side_panel' }
  | { name: 'open_in_page_search' };

export function openSidePanel(): AnalyticsEvent {
  return { name: 'open_side_panel' };
}

export function openInPageSearch(): AnalyticsEvent {
  return { name: 'open_in_page_search' };
}
