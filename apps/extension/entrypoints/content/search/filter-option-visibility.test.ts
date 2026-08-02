// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { getVisibleFilterOptions } from './filter-option-visibility';

const options = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

describe('getVisibleFilterOptions', () => {
  it('shows the leading options by default', () => {
    expect(getVisibleFilterOptions(options, undefined, 3)).toEqual(
      options.slice(0, 3),
    );
  });

  it('keeps a selected option visible outside the leading group', () => {
    expect(getVisibleFilterOptions(options, 'e', 3)).toEqual([
      options[0],
      options[1],
      options[4],
    ]);
  });

  it('does not duplicate a selected leading option', () => {
    expect(getVisibleFilterOptions(options, 'b', 3)).toEqual(
      options.slice(0, 3),
    );
  });
});
