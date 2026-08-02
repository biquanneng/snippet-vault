// SPDX-License-Identifier: MPL-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearCapturedSelectionHighlight,
  showCapturedSelectionHighlight,
} from './selection-highlight';

describe('captured selection highlight', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers a cloned range and removes both registry and style state', () => {
    const clonedRange = {} as Range;
    const range = {
      cloneRange: () => clonedRange,
    } as Range;
    const registry = new Map<string, Highlight>();
    class FakeHighlight {
      constructor(readonly initialRange: Range) {}
    }
    const style = {
      dataset: {},
      textContent: '',
      remove: vi.fn(),
    };
    const append = vi.fn();
    const ownerDocument = {
      createElement: vi.fn().mockReturnValue(style),
      head: { append },
      documentElement: { append },
    } as unknown as Document;

    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', FakeHighlight);

    expect(showCapturedSelectionHighlight(range, ownerDocument)).toBe(true);
    expect([...registry.values()]).toEqual([
      expect.objectContaining({ initialRange: clonedRange }),
    ]);
    expect(append).toHaveBeenCalledWith(style);
    expect(style.textContent).toContain(
      '::highlight(snippet-vault-captured-selection)',
    );

    clearCapturedSelectionHighlight(ownerDocument);

    expect(registry.size).toBe(0);
    expect(style.remove).toHaveBeenCalledOnce();
  });

  it('fails softly when the browser does not support custom highlights', () => {
    vi.stubGlobal('CSS', {});
    vi.stubGlobal('Highlight', undefined);

    expect(
      showCapturedSelectionHighlight({} as Range, {} as Document),
    ).toBe(false);
  });
});
