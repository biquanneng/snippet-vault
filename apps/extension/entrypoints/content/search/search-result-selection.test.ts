// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  getNextSearchResultSelectionId,
  getSearchResultOptionId,
} from './search-result-selection';

describe('getNextSearchResultSelectionId', () => {
  const itemIds = ['first', 'second', 'third'];

  it('selects an edge item when there is no current selection', () => {
    expect(getNextSearchResultSelectionId(itemIds, undefined, 1)).toBe(
      'first',
    );
    expect(getNextSearchResultSelectionId(itemIds, undefined, -1)).toBe(
      'third',
    );
  });

  it('moves within the result list without wrapping', () => {
    expect(getNextSearchResultSelectionId(itemIds, 'first', 1)).toBe(
      'second',
    );
    expect(getNextSearchResultSelectionId(itemIds, 'first', -1)).toBe(
      'first',
    );
    expect(getNextSearchResultSelectionId(itemIds, 'third', 1)).toBe(
      'third',
    );
  });

  it('returns no selection for an empty result list', () => {
    expect(getNextSearchResultSelectionId([], undefined, 1)).toBeUndefined();
  });

  it('creates a stable option id for aria-activedescendant', () => {
    expect(getSearchResultOptionId('results', 'item-1')).toBe(
      'results-item-1',
    );
  });
});
