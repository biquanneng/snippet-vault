// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  calculateTooltipPosition,
  getRangeSelectionBox,
  isKeyboardSelectionEvent,
  isSelectionBoxVisible,
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

  it('reads the current range position so the tooltip can follow page scrolling', () => {
    const range = {
      getBoundingClientRect: () => ({
        left: 120,
        right: 220,
        top: 180,
        bottom: 204,
        width: 100,
        height: 24,
      }),
      getClientRects: () => ({ item: () => null }),
    } as unknown as Range;

    expect(getRangeSelectionBox(range)).toEqual({
      left: 120,
      right: 220,
      top: 180,
      bottom: 204,
    });
  });

  it('keeps a tracked selection until it leaves the viewport', () => {
    const viewport = { width: 800, height: 600 };

    expect(
      isSelectionBoxVisible(
        { left: 120, right: 220, top: 580, bottom: 604 },
        viewport,
      ),
    ).toBe(true);
    expect(
      isSelectionBoxVisible(
        { left: 120, right: 220, top: 601, bottom: 625 },
        viewport,
      ),
    ).toBe(false);
  });

  it('ignores Enter while still recognizing keyboard selection gestures', () => {
    expect(
      isKeyboardSelectionEvent({
        key: 'Enter',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBe(false);
    expect(
      isKeyboardSelectionEvent({
        key: 'ArrowRight',
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBe(true);
    expect(
      isKeyboardSelectionEvent({
        key: 'a',
        shiftKey: false,
        ctrlKey: false,
        metaKey: true,
      }),
    ).toBe(true);
  });

});
