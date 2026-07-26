// SPDX-License-Identifier: MPL-2.0

import { MAX_SELECTION_LENGTH } from '../../lib/browser/message-contract';
import { selectionFragmentToMarkdown } from './selection-markdown';

const VIEWPORT_MARGIN = 12;
const TOOLTIP_GAP = 8;
const SELECTION_CONTEXT_BOUNDARIES = new Set([
  'article',
  'aside',
  'blockquote',
  'body',
  'details',
  'div',
  'figcaption',
  'figure',
  'footer',
  'header',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
]);

export interface SelectionBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ElementSize {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface TooltipPosition {
  left: number;
  top: number;
  placement: 'above' | 'below';
}

export interface SelectionSnapshot {
  markdown: string;
  box: SelectionBox;
}

export function normalizeSelectedText(text: string): string | null {
  if (!text.trim() || text.length > MAX_SELECTION_LENGTH) {
    return null;
  }
  return text;
}

export function readSelectionSnapshot(
  selection: Selection | null = window.getSelection(),
  baseUrl: string = document.baseURI,
): SelectionSnapshot | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  if (!normalizeSelectedText(selection.toString())) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const markdown = normalizeSelectedText(
    selectionFragmentToMarkdown(
      cloneRangeContentsWithContext(range),
      baseUrl,
    ),
  );
  if (!markdown) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  const fallbackRect = range.getClientRects().item(0);
  const effectiveRect = rect.width > 0 || rect.height > 0 ? rect : fallbackRect;

  if (!effectiveRect) {
    return null;
  }

  return {
    markdown,
    box: {
      left: effectiveRect.left,
      right: effectiveRect.right,
      top: effectiveRect.top,
      bottom: effectiveRect.bottom,
    },
  };
}

export function cloneRangeContentsWithContext(
  range: Range,
): DocumentFragment {
  const ownerDocument = range.startContainer.ownerDocument ?? document;
  const output = ownerDocument.createDocumentFragment();
  let content: Node = range.cloneContents();
  let context =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

  while (context && context.localName !== 'html') {
    const wrapper = context.cloneNode(false) as Element;
    wrapper.append(content);
    content = wrapper;
    if (
      SELECTION_CONTEXT_BOUNDARIES.has(context.localName) ||
      /^h[1-6]$/.test(context.localName)
    ) {
      break;
    }
    context = context.parentElement;
  }

  output.append(content);
  return output;
}

export function calculateTooltipPosition(
  selection: SelectionBox,
  tooltip: ElementSize,
  viewport: ViewportSize,
): TooltipPosition {
  const selectionCenter = (selection.left + selection.right) / 2;
  const maximumLeft = Math.max(
    VIEWPORT_MARGIN,
    viewport.width - tooltip.width - VIEWPORT_MARGIN,
  );
  const left = clamp(
    selectionCenter - tooltip.width / 2,
    VIEWPORT_MARGIN,
    maximumLeft,
  );
  const fitsAbove =
    selection.top - tooltip.height - TOOLTIP_GAP >= VIEWPORT_MARGIN;
  const proposedTop = fitsAbove
    ? selection.top - tooltip.height - TOOLTIP_GAP
    : selection.bottom + TOOLTIP_GAP;
  const maximumTop = Math.max(
    VIEWPORT_MARGIN,
    viewport.height - tooltip.height - VIEWPORT_MARGIN,
  );

  return {
    left: Math.round(left),
    top: Math.round(clamp(proposedTop, VIEWPORT_MARGIN, maximumTop)),
    placement: fitsAbove ? 'above' : 'below',
  };
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ),
  );
}

export function isSnippetVaultUiEvent(event: Event): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        target.dataset.snippetVaultUi === 'true',
    );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
