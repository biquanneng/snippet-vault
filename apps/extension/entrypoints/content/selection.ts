// SPDX-License-Identifier: MPL-2.0

import { MAX_SELECTION_LENGTH } from '../../lib/browser/message-contract';
import { selectionFragmentToMarkdown } from './selection-markdown';

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

export interface ViewportSize {
  width: number;
  height: number;
}

export interface SelectionSnapshot {
  markdown: string;
  box: SelectionBox;
}

interface KeyboardSelectionEvent {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

const KEYBOARD_SELECTION_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]);

export function normalizeSelectedText(text: string): string | null {
  if (!text.trim() || text.length > MAX_SELECTION_LENGTH) {
    return null;
  }
  return text;
}

export function isKeyboardSelectionEvent(
  event: KeyboardSelectionEvent,
): boolean {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLocaleLowerCase() === 'a'
  ) {
    return true;
  }

  return event.shiftKey && KEYBOARD_SELECTION_KEYS.has(event.key);
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

  const box = getRangeSelectionBox(range);
  if (!box) {
    return null;
  }

  return {
    markdown,
    box,
  };
}

export function getRangeSelectionBox(range: Range): SelectionBox | null {
  const rect = range.getBoundingClientRect();
  const fallbackRect = range.getClientRects().item(0);
  const effectiveRect = rect.width > 0 || rect.height > 0 ? rect : fallbackRect;

  if (!effectiveRect) {
    return null;
  }

  return {
    left: effectiveRect.left,
    right: effectiveRect.right,
    top: effectiveRect.top,
    bottom: effectiveRect.bottom,
  };
}

export function isSelectionBoxVisible(
  box: SelectionBox,
  viewport: ViewportSize,
): boolean {
  return (
    box.right >= 0 &&
    box.left <= viewport.width &&
    box.bottom >= 0 &&
    box.top <= viewport.height
  );
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

// Password fields are left out on purpose: browsers block copying them, so
// the first copy would not behave natively. Types without the selection API
// (email, number) are left out because their selection cannot be read.
const SELECTABLE_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel']);

export interface TextControlLike {
  localName: string;
  type?: string;
  value: string;
  selectionStart: number | null;
  selectionEnd: number | null;
  getBoundingClientRect(): SelectionBox;
}

export interface TextControlSelectionSnapshot extends SelectionSnapshot {
  start: number;
  end: number;
}

/**
 * Many consoles show API keys in a (read-only) input or textarea, whose
 * selection never appears in `window.getSelection()`.
 */
export function getSelectableTextControl(
  target: unknown,
): TextControlLike | null {
  const control = target as Partial<TextControlLike> | null;
  if (!control || typeof control.value !== 'string') {
    return null;
  }
  if (control.localName === 'textarea') {
    return control as TextControlLike;
  }
  if (
    control.localName === 'input' &&
    SELECTABLE_INPUT_TYPES.has(control.type ?? '')
  ) {
    return control as TextControlLike;
  }
  return null;
}

export function readTextControlSnapshot(
  control: TextControlLike,
): TextControlSelectionSnapshot | null {
  const { selectionStart: start, selectionEnd: end } = control;
  if (start === null || end === null || start >= end) {
    return null;
  }

  // Control values are plain text, which is already valid Markdown.
  const markdown = normalizeSelectedText(control.value.slice(start, end));
  if (!markdown) {
    return null;
  }

  const { left, right, top, bottom } = control.getBoundingClientRect();
  return {
    markdown,
    box: { left, right, top, bottom },
    start,
    end,
  };
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
