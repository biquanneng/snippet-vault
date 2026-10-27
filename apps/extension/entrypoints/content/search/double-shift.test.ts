// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { DoubleShiftDetector } from './double-shift';

describe('DoubleShiftDetector', () => {
  it('opens after two standalone Shift presses within the threshold', () => {
    const detector = new DoubleShiftDetector(400);

    expect(detector.register(shiftEvent(100))).toBe(false);
    expect(detector.register(shiftEvent(450))).toBe(true);
  });

  it('does not open after the threshold or a different key', () => {
    const detector = new DoubleShiftDetector(400);

    expect(detector.register(shiftEvent(100))).toBe(false);
    expect(detector.register(shiftEvent(600))).toBe(false);
    expect(detector.register(keyEvent('A', 650))).toBe(false);
    expect(detector.register(shiftEvent(700))).toBe(false);
  });

  it('ignores repeated and modified Shift key events', () => {
    const detector = new DoubleShiftDetector(400);

    expect(detector.register(shiftEvent(100, { repeat: true }))).toBe(false);
    expect(detector.register(shiftEvent(150))).toBe(false);
    expect(detector.register(shiftEvent(200, { metaKey: true }))).toBe(false);
    expect(detector.register(shiftEvent(250))).toBe(false);
  });
});

function shiftEvent(
  timeStamp: number,
  overrides: Partial<KeyboardEvent> = {},
): Pick<
  KeyboardEvent,
  'key' | 'timeStamp' | 'repeat' | 'altKey' | 'ctrlKey' | 'metaKey'
> {
  return {
    key: 'Shift',
    timeStamp,
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

function keyEvent(
  key: string,
  timeStamp: number,
): ReturnType<typeof shiftEvent> {
  return {
    ...shiftEvent(timeStamp),
    key,
  };
}
