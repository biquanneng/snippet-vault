// SPDX-License-Identifier: MPL-2.0

import { Fragment, useMemo, type ReactNode } from 'react';

import { HighlightedText } from './HighlightedText';
import {
  parseMarkdown,
  type MarkdownBlock,
  type MarkdownInline,
} from './markdown-parser';
import { findSearchHighlightRanges } from './search-highlight';

interface MarkdownContentProps {
  markdown: string;
  query: string;
}

interface MarkdownBlocksProps {
  blocks: MarkdownBlock[];
  compact?: boolean;
  query: string;
}

export function MarkdownContent({
  markdown,
  query,
}: MarkdownContentProps) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <div className="mt-2 max-h-48 overflow-auto break-words text-sm leading-6 text-foreground">
      <MarkdownBlocks blocks={blocks} query={query} />
    </div>
  );
}

function MarkdownBlocks({
  blocks,
  compact = false,
  query,
}: MarkdownBlocksProps) {
  return blocks.map((block, index) => (
    <MarkdownBlockView
      key={`${block.type}-${index}`}
      block={block}
      compact={compact}
      first={index === 0}
      query={query}
    />
  ));
}

function MarkdownBlockView({
  block,
  compact,
  first,
  query,
}: {
  block: MarkdownBlock;
  compact: boolean;
  first: boolean;
  query: string;
}) {
  const spacing = first || compact ? '' : 'mt-2';

  switch (block.type) {
    case 'paragraph':
      return (
        <p className={`${spacing} whitespace-pre-wrap`}>
          <MarkdownInlines nodes={block.children} query={query} />
        </p>
      );
    case 'heading':
      return (
        <MarkdownHeading
          block={block}
          className={spacing}
          query={query}
        />
      );
    case 'code':
      return (
        <div className={spacing}>
          {block.language ? (
            <div className="rounded-t-md border border-b-0 bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
              {block.language}
            </div>
          ) : null}
          <pre
            className={
              block.language
                ? 'overflow-x-auto rounded-b-md border bg-muted/40 p-3 font-mono text-xs leading-5'
                : 'overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-5'
            }
          >
            <code>
              <HighlightedText text={block.value} query={query} />
            </code>
          </pre>
        </div>
      );
    case 'blockquote':
      return (
        <blockquote
          className={`${spacing} border-l-2 pl-3 text-muted-foreground`}
        >
          <MarkdownBlocks blocks={block.children} compact query={query} />
        </blockquote>
      );
    case 'list': {
      const children = block.items.map((item, index) => (
        <li key={index}>
          <MarkdownBlocks blocks={item} compact query={query} />
        </li>
      ));
      return block.ordered ? (
        <ol
          className={`${spacing} list-decimal space-y-1 pl-5`}
          start={block.start}
        >
          {children}
        </ol>
      ) : (
        <ul className={`${spacing} list-disc space-y-1 pl-5`}>
          {children}
        </ul>
      );
    }
    case 'table':
      return (
        <div className={`${spacing} overflow-x-auto`}>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b">
                {block.header.map((cell, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="px-2 py-1.5 font-medium"
                  >
                    <MarkdownInlines nodes={cell} query={query} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-2 py-1.5 align-top">
                      <MarkdownInlines nodes={cell} query={query} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'separator':
      return <hr className={`${spacing} border-t`} />;
  }
}

function MarkdownHeading({
  block,
  className,
  query,
}: {
  block: Extract<MarkdownBlock, { type: 'heading' }>;
  className: string;
  query: string;
}) {
  const children = (
    <MarkdownInlines nodes={block.children} query={query} />
  );
  const headingClass =
    block.level <= 2
      ? `${className} font-sans text-base font-semibold leading-6`
      : `${className} font-sans text-sm font-semibold leading-6`;

  if (block.level === 1) {
    return <h3 className={headingClass}>{children}</h3>;
  }
  if (block.level === 2) {
    return <h4 className={headingClass}>{children}</h4>;
  }
  if (block.level === 3) {
    return <h5 className={headingClass}>{children}</h5>;
  }
  return <h6 className={headingClass}>{children}</h6>;
}

function MarkdownInlines({
  nodes,
  query,
}: {
  nodes: MarkdownInline[];
  query: string;
}) {
  return nodes.map((node, index) => (
    <Fragment key={`${node.type}-${index}`}>
      {renderInline(node, query)}
    </Fragment>
  ));
}

function renderInline(node: MarkdownInline, query: string): ReactNode {
  switch (node.type) {
    case 'text':
      return <HighlightedText text={node.value} query={query} />;
    case 'break':
      return <br />;
    case 'code':
      return (
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          <HighlightedText text={node.value} query={query} />
        </code>
      );
    case 'strong':
      return (
        <strong className="font-semibold">
          <MarkdownInlines nodes={node.children} query={query} />
        </strong>
      );
    case 'emphasis':
      return (
        <em>
          <MarkdownInlines nodes={node.children} query={query} />
        </em>
      );
    case 'delete':
      return (
        <del>
          <MarkdownInlines nodes={node.children} query={query} />
        </del>
      );
    case 'image-alt':
      return (
        <span aria-label="图片替代文本">
          <MarkdownInlines nodes={node.children} query={query} />
        </span>
      );
    case 'link': {
      const urlMatched =
        findSearchHighlightRanges(node.href, query).length > 0;
      return (
        <>
          <a
            href={node.href}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            <MarkdownInlines nodes={node.children} query={query} />
          </a>
          {urlMatched ? (
            <span className="ml-1 break-all font-mono text-xs text-muted-foreground">
              (
              <HighlightedText text={node.href} query={query} />)
            </span>
          ) : null}
        </>
      );
    }
  }
}
