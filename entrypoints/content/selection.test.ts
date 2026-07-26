// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  calculateTooltipPosition,
  normalizeSelectedText,
} from './selection';

describe('content selection helpers', () => {
  it('keeps selected whitespace while rejecting an empty selection', () => {
    expect(normalizeSelectedText('  secret value  ')).toBe('  secret value  ');
    expect(normalizeSelectedText(' \n\t ')).toBeNull();
  });

  it('places the tooltip above the selection when space is available', () => {
    expect(
      calculateTooltipPosition(
        { left: 200, right: 300, top: 200, bottom: 220 },
        { width: 240, height: 80 },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      left: 130,
      top: 112,
      placement: 'above',
    });
  });

  it('flips below and clamps to the viewport on narrow pages', () => {
    expect(
      calculateTooltipPosition(
        { left: 0, right: 20, top: 5, bottom: 25 },
        { width: 280, height: 100 },
        { width: 300, height: 500 },
      ),
    ).toEqual({
      left: 12,
      top: 33,
      placement: 'below',
    });
  });
});
