// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import { parseMarkdown, parseMarkdownInline } from './markdown-parser';

describe('Markdown parser', () => {
  it('parses the block structures emitted by selection capture', () => {
    const blocks = parseMarkdown(
      [
        '# Deployment',
        '',
        '> Keep this local.',
        '',
        '- first',
        '- second',
        '',
        '```ts',
        'const token = "synthetic";',
        '```',
        '',
        '| Name | Value |',
        '| --- | --- |',
        '| Region | cn-hangzhou |',
      ].join('\n'),
    );

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'blockquote',
      'list',
      'code',
      'table',
    ]);
  });

  it('parses safe inline formatting and links', () => {
    expect(
      parseMarkdownInline(
        '**API** *token* and [Docs](<https://example.com/guide>)',
      ),
    ).toMatchObject([
      { type: 'strong' },
      { type: 'text', value: ' ' },
      { type: 'emphasis' },
      { type: 'text', value: ' and ' },
      {
        type: 'link',
        href: 'https://example.com/guide',
      },
    ]);
  });

  it('does not turn raw HTML or unsafe links into executable content', () => {
    const nodes = parseMarkdownInline(
      '<script>alert(1)</script> [open](javascript:alert(1))',
    );

    expect(nodes).toEqual([
      {
        type: 'text',
        value: '<script>alert(1)</script> [open](javascript:alert(1))',
      },
    ]);
  });
});
