// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it, vi } from 'vitest';

import { raiseContentLayer, supportsTopLayer } from './content-top-layer';

function createLayer(options: { open: boolean; focused?: object | null }) {
  const calls: string[] = [];
  let open = options.open;
  const focusedElement = options.focused
    ? { ...options.focused, focus: vi.fn() }
    : null;
  const layer = {
    isConnected: true,
    matches: (selector: string) => selector === ':popover-open' && open,
    contains: (node: unknown) => node === focusedElement,
    getRootNode: () => ({ activeElement: focusedElement }),
    showPopover: () => {
      calls.push('show');
      open = true;
    },
    hidePopover: () => {
      calls.push('hide');
      open = false;
    },
  };
  return { layer: layer as never, calls, focusedElement };
}

describe('content top layer', () => {
  it('shows a closed layer without hiding it first', () => {
    const { layer, calls } = createLayer({ open: false });

    raiseContentLayer(layer);

    expect(calls).toEqual(['show']);
  });

  it('re-shows an open layer so it moves above newer top-layer elements', () => {
    const { layer, calls } = createLayer({ open: true });

    raiseContentLayer(layer);

    expect(calls).toEqual(['hide', 'show']);
  });

  it('restores focus that was inside the layer', () => {
    const { layer, focusedElement } = createLayer({
      open: true,
      focused: {},
    });

    raiseContentLayer(layer);

    expect(focusedElement?.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('does nothing without Popover API support', () => {
    const layer = {
      isConnected: true,
      matches: () => {
        throw new SyntaxError('unsupported selector');
      },
      contains: () => false,
      getRootNode: () => ({}),
    };

    expect(supportsTopLayer(layer as never)).toBe(false);
    expect(() => raiseContentLayer(layer as never)).not.toThrow();
  });

  it('does nothing while the layer is detached', () => {
    const { layer, calls } = createLayer({ open: false });
    (layer as { isConnected: boolean }).isConnected = false;

    raiseContentLayer(layer);

    expect(calls).toEqual([]);
  });
});
