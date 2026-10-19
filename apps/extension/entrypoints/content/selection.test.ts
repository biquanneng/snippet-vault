// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  getRangeSelectionBox,
  getSelectableTextControl,
  isKeyboardSelectionEvent,
  isSelectionBoxVisible,
  normalizeSelectedText,
  readTextControlSnapshot,
  type TextControlLike,
} from './selection';

function textControl(
  overrides: Partial<TextControlLike> = {},
): TextControlLike {
  return {
    localName: 'input',
    type: 'text',
    value: 'key: sk-test-123',
    selectionStart: 5,
    selectionEnd: 16,
    getBoundingClientRect: () => ({
      left: 10,
      right: 310,
      top: 40,
      bottom: 72,
    }),
    ...overrides,
  };
}

describe('content selection helpers', () => {
  it('keeps selected whitespace while rejecting an empty selection', () => {
    expect(normalizeSelectedText('  secret value  ')).toBe('  secret value  ');
    expect(normalizeSelectedText(' \n\t ')).toBeNull();
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

  it('reads an API key selected inside a text input or textarea', () => {
    const input = textControl();
    expect(getSelectableTextControl(input)).toBe(input);
    expect(readTextControlSnapshot(input)).toEqual({
      markdown: 'sk-test-123',
      box: { left: 10, right: 310, top: 40, bottom: 72 },
      start: 5,
      end: 16,
    });

    const textarea = textControl({ localName: 'textarea', type: 'textarea' });
    expect(getSelectableTextControl(textarea)).toBe(textarea);
  });

  it('leaves password fields and selection-less inputs to the browser', () => {
    expect(getSelectableTextControl(textControl({ type: 'password' }))).toBeNull();
    expect(getSelectableTextControl(textControl({ type: 'email' }))).toBeNull();
    expect(
      getSelectableTextControl({ localName: 'div' }),
    ).toBeNull();
    expect(getSelectableTextControl(null)).toBeNull();
  });

  it('ignores a collapsed or blank text-control selection', () => {
    expect(
      readTextControlSnapshot(textControl({ selectionStart: 3, selectionEnd: 3 })),
    ).toBeNull();
    expect(
      readTextControlSnapshot(
        textControl({ value: 'a    b', selectionStart: 1, selectionEnd: 5 }),
      ),
    ).toBeNull();
    expect(
      readTextControlSnapshot(
        textControl({ selectionStart: null, selectionEnd: null }),
      ),
    ).toBeNull();
  });
});
