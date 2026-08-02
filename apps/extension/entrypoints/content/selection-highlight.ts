// SPDX-License-Identifier: MPL-2.0

const CAPTURED_SELECTION_HIGHLIGHT = 'snippet-vault-captured-selection';
const highlightStyles = new WeakMap<Document, HTMLStyleElement>();

export function showCapturedSelectionHighlight(
  range: Range,
  ownerDocument: Document = document,
): boolean {
  if (
    typeof CSS === 'undefined' ||
    !('highlights' in CSS) ||
    typeof Highlight === 'undefined'
  ) {
    return false;
  }

  try {
    const style =
      highlightStyles.get(ownerDocument) ?? createHighlightStyle(ownerDocument);
    highlightStyles.set(ownerDocument, style);
    if (!style.isConnected) {
      (ownerDocument.head ?? ownerDocument.documentElement).append(style);
    }

    CSS.highlights.set(
      CAPTURED_SELECTION_HIGHLIGHT,
      new Highlight(range.cloneRange()),
    );
    return true;
  } catch {
    CSS.highlights.delete(CAPTURED_SELECTION_HIGHLIGHT);
    return false;
  }
}

export function clearCapturedSelectionHighlight(
  ownerDocument: Document = document,
) {
  if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
    CSS.highlights.delete(CAPTURED_SELECTION_HIGHLIGHT);
  }
  highlightStyles.get(ownerDocument)?.remove();
  highlightStyles.delete(ownerDocument);
}

function createHighlightStyle(ownerDocument: Document): HTMLStyleElement {
  const style = ownerDocument.createElement('style');
  style.dataset.snippetVaultSelectionHighlight = 'true';
  style.textContent = `
::highlight(${CAPTURED_SELECTION_HIGHLIGHT}) {
  background-color: Highlight;
  color: HighlightText;
}
`;
  return style;
}
