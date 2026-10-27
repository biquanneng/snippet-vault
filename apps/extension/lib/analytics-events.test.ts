// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  openInPageSearch,
  openSidePanel,
} from './analytics-events';

describe('analytics event contract', () => {
  it('contains only the two product-entry events', () => {
    expect(openSidePanel()).toEqual({ name: 'open_side_panel' });
    expect(openInPageSearch()).toEqual({
      name: 'open_in_page_search',
    });
  });
});
