// SPDX-License-Identifier: MPL-2.0

import { Fragment, type ReactNode } from 'react';

import { findSearchHighlightRanges } from './search-highlight';

interface HighlightedTextProps {
  text: string;
  query: string;
}

export function HighlightedText({
  text,
  query,
}: HighlightedTextProps) {
  const ranges = findSearchHighlightRanges(text, query);
  if (ranges.length === 0) {
    return text;
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push(
        <Fragment key={`text-${cursor}`}>
          {text.slice(cursor, range.start)}
        </Fragment>,
      );
    }
    parts.push(
      <mark
        key={`mark-${range.start}`}
        className="rounded-sm bg-primary/15 text-inherit"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push(
      <Fragment key={`text-${cursor}`}>{text.slice(cursor)}</Fragment>,
    );
  }

  return parts;
}
