// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  getContextPresetColor,
  getStoredContextColor,
  isContextColor,
} from './context-colors';

describe('context colors', () => {
  it('uses stable defaults for built-in environments and legacy presets', () => {
    expect(
      getContextPresetColor({
        environment: 'development',
      }),
    ).toBe('blue');
    expect(
      getContextPresetColor({
        environment: 'production',
      }),
    ).toBe('red');
    expect(getContextPresetColor({})).toBe('slate');
    expect(getContextPresetColor({ color: 'purple' })).toBe('purple');
    expect(
      getContextPresetColor({
        color: 'pink',
        environment: 'unsupported',
      }),
    ).toBe('slate');
  });

  it('keeps stored colors authoritative and infers legacy environment colors', () => {
    expect(getStoredContextColor('green', '生产环境')).toBe('green');
    expect(getStoredContextColor(undefined, '生产环境')).toBe('red');
    expect(getStoredContextColor(undefined, 'meowdex')).toBe('slate');
    expect(getStoredContextColor('pink', 'meowdex')).toBe('slate');
  });

  it('recognizes only the supported palette keys', () => {
    expect(isContextColor('amber')).toBe(true);
    expect(isContextColor('pink')).toBe(false);
    expect(isContextColor(undefined)).toBe(false);
  });
});
