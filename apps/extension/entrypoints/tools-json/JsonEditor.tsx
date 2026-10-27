// SPDX-License-Identifier: MPL-2.0

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, placeholder as placeholderExtension } from '@codemirror/view';
import { tags } from '@lezer/highlight';

export interface JsonEditorHandle {
  getText: () => string;
  setText: (text: string) => void;
  /** Moves the caret to a 1-based line/column and scrolls it into view. */
  focusAt: (line: number, column: number) => void;
  focus: () => void;
}

interface JsonEditorProps {
  ariaLabel: string;
  placeholder?: string;
  readOnly?: boolean;
  onChange?: () => void;
}

// Colors come from CSS variables so the editor follows the extension theme.
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    fontSize: '13px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    fontVariantLigatures: 'none',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: 'var(--foreground)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--foreground)' },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    color: 'var(--muted-foreground)',
    border: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in oklab, var(--muted) 60%, transparent)',
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    {
      backgroundColor: 'color-mix(in oklab, var(--primary) 18%, transparent)',
    },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in oklab, var(--primary) 14%, transparent)',
    outline: 'none',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--muted)',
    border: 'none',
    color: 'var(--muted-foreground)',
  },
  '.cm-placeholder': { color: 'var(--muted-foreground)' },
});

const jsonHighlight = HighlightStyle.define([
  { tag: tags.propertyName, color: 'var(--json-key)' },
  { tag: tags.string, color: 'var(--json-string)' },
  { tag: tags.number, color: 'var(--json-number)' },
  { tag: [tags.bool, tags.null], color: 'var(--json-literal)' },
  { tag: tags.invalid, color: 'var(--destructive)' },
]);

export const JsonEditor = forwardRef<JsonEditorHandle, JsonEditorProps>(
  function JsonEditor({ ariaLabel, placeholder, readOnly = false, onChange }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Survives re-creating the editor when the UI language changes.
    const textRef = useRef('');
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
      const view = new EditorView({
        parent: hostRef.current!,
        state: EditorState.create({
          doc: textRef.current,
          extensions: [
            basicSetup,
            json(),
            syntaxHighlighting(jsonHighlight),
            editorTheme,
            EditorView.lineWrapping,
            EditorState.readOnly.of(readOnly),
            EditorView.contentAttributes.of({
              'aria-label': ariaLabel,
              spellcheck: 'false',
              autocorrect: 'off',
              autocapitalize: 'off',
            }),
            placeholder ? placeholderExtension(placeholder) : [],
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                onChangeRef.current?.();
              }
            }),
          ],
        }),
      });
      viewRef.current = view;
      return () => {
        textRef.current = view.state.doc.toString();
        view.destroy();
        viewRef.current = null;
      };
    }, [ariaLabel, placeholder, readOnly]);

    useImperativeHandle(ref, () => ({
      getText: () => viewRef.current?.state.doc.toString() ?? '',
      setText: (text) => {
        const view = viewRef.current;
        if (!view) {
          return;
        }
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
          selection: { anchor: 0 },
          scrollIntoView: true,
        });
      },
      focusAt: (line, column) => {
        const view = viewRef.current;
        if (!view) {
          return;
        }
        const { doc } = view.state;
        const target = doc.line(Math.min(Math.max(line, 1), doc.lines));
        const anchor = Math.min(target.from + column - 1, target.to);
        view.dispatch({ selection: { anchor }, scrollIntoView: true });
        view.focus();
      },
      focus: () => viewRef.current?.focus(),
    }));

    return <div ref={hostRef} className="h-full min-h-0 overflow-hidden" />;
  },
);
