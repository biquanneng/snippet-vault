// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { MAX_SOURCE_TITLE_LENGTH } from './message-contract';
import { toPageSource } from './page-source';

describe('page source', () => {
  it('keeps HTTP(S) pages with a trimmed title', () => {
    expect(
      toPageSource('https://ram.console.aliyun.com/users', '  RAM 访问控制 '),
    ).toEqual({
      title: 'RAM 访问控制',
      url: 'https://ram.console.aliyun.com/users',
    });
    expect(toPageSource('http://localhost:3000/', '')).toEqual({
      url: 'http://localhost:3000/',
    });
  });

  it.each([
    'chrome://extensions/',
    'chrome-extension://abc/sidepanel.html',
    'file:///Users/me/notes.txt',
    'not a url',
    `https://example.com/${'a'.repeat(2_100)}`,
    undefined,
  ])('rejects unsupported source %s', (url) => {
    expect(toPageSource(url, 'Title')).toBeNull();
  });

  it('caps very long titles', () => {
    const source = toPageSource('https://example.com', 'x'.repeat(900));
    expect(source?.title).toHaveLength(MAX_SOURCE_TITLE_LENGTH);
  });
});
