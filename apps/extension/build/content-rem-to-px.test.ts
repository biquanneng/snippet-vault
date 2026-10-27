// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { remToPx } from './content-rem-to-px';

describe('content rem to px', () => {
  it('converts rem lengths with a fixed 16px root', () => {
    expect(remToPx('0.25rem')).toBe('4px');
    expect(remToPx('calc(1.25rem + .5rem)')).toBe('calc(20px + 8px)');
    expect(remToPx('-0.625rem')).toBe('-10px');
    expect(remToPx('0.8rem')).toBe('12.8px');
  });

  it('leaves non-rem tokens untouched', () => {
    expect(remToPx('var(--remove-1) 2em 3px')).toBe('var(--remove-1) 2em 3px');
    expect(remToPx('calc(1 / 0.75)')).toBe('calc(1 / 0.75)');
  });
});
