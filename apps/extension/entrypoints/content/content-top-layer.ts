// SPDX-License-Identifier: MPL-2.0

/**
 * Popover UA styles are reset so the layer stays a transparent, full-viewport
 * overlay. `z-99` only matters when the Popover API is unavailable.
 */
export const CONTENT_LAYER_CLASS_NAME =
  'pointer-events-none fixed inset-0 z-99 m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-inherit';

type TopLayerElement = Pick<
  HTMLElement,
  'isConnected' | 'matches' | 'contains' | 'getRootNode'
> & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

/** Creates the element that hosts every in-page SnippetVault surface. */
export function createContentLayer(ownerDocument: Document): HTMLDivElement {
  const layer = ownerDocument.createElement('div');
  layer.dataset.snippetVaultLayer = 'true';
  layer.className = CONTENT_LAYER_CLASS_NAME;
  if (supportsTopLayer(layer)) {
    layer.popover = 'manual';
  }
  return layer;
}

export function supportsTopLayer(layer: TopLayerElement): boolean {
  return (
    typeof layer.showPopover === 'function' &&
    typeof layer.hidePopover === 'function'
  );
}

/**
 * Moves the layer above host-page top-layer elements opened after it, such as
 * a native `<dialog>`. Re-showing is the only way to reorder the top layer.
 */
export function raiseContentLayer(layer: TopLayerElement): void {
  if (!supportsTopLayer(layer) || !layer.isConnected) {
    return;
  }

  const root = layer.getRootNode();
  const focused =
    'activeElement' in root ? (root.activeElement as Element | null) : null;

  if (isPopoverOpen(layer)) {
    layer.hidePopover?.();
  }
  layer.showPopover?.();

  // Hiding a popover blurs focused descendants; restore focus inside our UI.
  if (focused && layer.contains(focused) && 'focus' in focused) {
    (focused as HTMLElement).focus({ preventScroll: true });
  }
}

function isPopoverOpen(layer: TopLayerElement): boolean {
  try {
    return layer.matches(':popover-open');
  } catch {
    return false;
  }
}
