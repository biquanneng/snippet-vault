// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

const searchRequestStorage = storage.defineItem<number>(
  'session:side-panel-search-request',
  { fallback: 0 },
);

export async function requestSidePanelSearch(): Promise<void> {
  await searchRequestStorage.setValue(Date.now());
}

export function watchSidePanelSearchRequests(
  listener: () => void,
): () => void {
  return searchRequestStorage.watch(() => listener());
}
