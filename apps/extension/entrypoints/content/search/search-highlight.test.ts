// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { findSearchHighlightRanges } from './search-highlight';

describe('search result highlighting', () => {
  it('marks Latin prefixes and camel-case words using search semantics', () => {
    const value = 'production clientSecret';
    const ranges = findSearchHighlightRanges(value, 'prod secret');

    expect(ranges.map((range) => value.slice(range.start, range.end))).toEqual([
      'prod',
      'Secret',
    ]);
  });

  it('marks a CJK phrase even when punctuation separates its characters', () => {
    const value = '阿里云-控制台';
    const ranges = findSearchHighlightRanges(value, '云控制');

    expect(ranges).toEqual([{ start: 2, end: 6 }]);
    expect(value.slice(ranges[0].start, ranges[0].end)).toBe('云-控制');
  });

  it('marks CJK bigrams when one query is satisfied across separate text runs', () => {
    const value = '云控 via 控制';
    const ranges = findSearchHighlightRanges(value, '云控制');

    expect(ranges.map((range) => value.slice(range.start, range.end))).toEqual([
      '云控',
      '控制',
    ]);
  });

  it('does not mark a non-prefix Latin substring that FlexSearch cannot match', () => {
    expect(findSearchHighlightRanges('production', 'duction')).toEqual([]);
  });

  it('marks searchable words inside Markdown without interpreting it as HTML', () => {
    const value = '[API token](<https://example.com/token>)';
    const ranges = findSearchHighlightRanges(value, 'api exa');

    expect(ranges.map((range) => value.slice(range.start, range.end))).toEqual([
      'API',
      'exa',
    ]);
  });
});
