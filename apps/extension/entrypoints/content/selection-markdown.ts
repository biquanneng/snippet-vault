// SPDX-License-Identifier: MPL-2.0

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

const OMITTED_ELEMENTS = new Set([
  'audio',
  'button',
  'canvas',
  'embed',
  'form',
  'iframe',
  'input',
  'noscript',
  'object',
  'option',
  'picture',
  'script',
  'select',
  'source',
  'style',
  'svg',
  'template',
  'textarea',
  'video',
]);

const BLOCK_ELEMENTS = new Set([
  'address',
  'article',
  'aside',
  'dd',
  'details',
  'dialog',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'header',
  'main',
  'nav',
  'p',
  'section',
  'summary',
]);

interface MarkdownRenderContext {
  baseUrl: string;
}

export function selectionFragmentToMarkdown(
  fragment: DocumentFragment,
  baseUrl: string,
): string {
  return cleanMarkdown(renderChildren(fragment, { baseUrl }));
}

function renderChildren(
  parent: ParentNode,
  context: MarkdownRenderContext,
): string {
  return Array.from(parent.childNodes)
    .map((node) => renderNode(node, context))
    .join('');
}

function renderNode(node: Node, context: MarkdownRenderContext): string {
  if (node.nodeType === TEXT_NODE) {
    return escapeMarkdown(normalizeInlineWhitespace(node.nodeValue ?? ''));
  }
  if (node.nodeType !== ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const tag = element.localName;
  if (
    OMITTED_ELEMENTS.has(tag) ||
    element.hasAttribute('hidden') ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return '';
  }

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    return asBlock(`${'#'.repeat(level)} ${renderChildren(element, context)}`);
  }

  switch (tag) {
    case 'a':
      return renderLink(element, context);
    case 'blockquote':
      return renderBlockquote(element, context);
    case 'br':
      return '\n';
    case 'code':
      return element.parentElement?.localName === 'pre'
        ? element.textContent ?? ''
        : renderInlineCode(element.textContent ?? '');
    case 'del':
    case 's':
    case 'strike':
      return wrapInline('~~', renderChildren(element, context));
    case 'em':
    case 'i':
      return wrapInline('*', renderChildren(element, context));
    case 'hr':
      return asBlock('---');
    case 'img':
      return escapeMarkdown(element.getAttribute('alt')?.trim() ?? '');
    case 'ol':
      return renderList(element, context, true);
    case 'pre':
      return renderCodeBlock(element);
    case 'strong':
    case 'b':
      return wrapInline('**', renderChildren(element, context));
    case 'table':
      return renderTable(element, context);
    case 'ul':
      return renderList(element, context, false);
    default: {
      const content = renderChildren(element, context);
      return BLOCK_ELEMENTS.has(tag) ? asBlock(content) : content;
    }
  }
}

function renderLink(
  element: Element,
  context: MarkdownRenderContext,
): string {
  const content = renderChildren(element, context);
  const href = resolveSafeUrl(element.getAttribute('href'), context.baseUrl);
  if (!href) {
    return content;
  }

  const { leading, core, trailing } = splitOuterWhitespace(content);
  const label = core || escapeMarkdown(href);
  return `${leading}[${label}](<${href.replaceAll('>', '%3E')}>)${trailing}`;
}

function renderBlockquote(
  element: Element,
  context: MarkdownRenderContext,
): string {
  const content = cleanMarkdown(renderChildren(element, context));
  if (!content) {
    return '';
  }
  return asBlock(
    content
      .split('\n')
      .map((line) => (line ? `> ${line}` : '>'))
      .join('\n'),
  );
}

function renderInlineCode(value: string): string {
  if (!value) {
    return '';
  }

  const longestRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = '`'.repeat(Math.max(1, longestRun + 1));
  const padding = /^\s|\s$|^`|`$/.test(value) ? ' ' : '';
  return `${fence}${padding}${value}${padding}${fence}`;
}

function renderCodeBlock(element: Element): string {
  const value = (element.textContent ?? '').replace(/\r\n?/g, '\n');
  if (!value) {
    return '';
  }

  const longestRun = Math.max(
    0,
    ...Array.from(value.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = '`'.repeat(Math.max(3, longestRun + 1));
  const language = findCodeLanguage(element);
  const code = value.endsWith('\n') ? value.slice(0, -1) : value;
  return asBlock(`${fence}${language}\n${code}\n${fence}`);
}

function findCodeLanguage(element: Element): string {
  const code = element.querySelector('code');
  const className = code?.getAttribute('class') ?? element.getAttribute('class');
  const match = className?.match(/(?:^|\s)(?:language-|lang-)([\w+-]+)/i);
  return match?.[1] ?? '';
}

function renderList(
  element: Element,
  context: MarkdownRenderContext,
  ordered: boolean,
): string {
  const items = Array.from(element.children).filter(
    (child) => child.localName === 'li',
  );
  if (items.length === 0) {
    return asBlock(renderChildren(element, context));
  }

  const markdown = items
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : '- ';
      const indentation = ' '.repeat(prefix.length);
      const content = cleanMarkdown(renderChildren(item, context));
      const lines = content.split('\n');
      return `${prefix}${lines
        .map((line, lineIndex) =>
          lineIndex === 0 ? line : `${indentation}${line}`,
        )
        .join('\n')}`;
    })
    .join('\n');

  return asBlock(markdown);
}

function renderTable(
  element: Element,
  context: MarkdownRenderContext,
): string {
  const rows = Array.from(element.querySelectorAll('tr'))
    .filter((row) => row.closest('table') === element)
    .map((row) =>
      Array.from(row.children)
        .filter(
          (cell) => cell.localName === 'th' || cell.localName === 'td',
        )
        .map((cell) =>
          escapeTablePipes(
            cleanMarkdown(renderChildren(cell, context)).replace(
              /\n+/g,
              '<br>',
            ),
          ),
        ),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) {
    return asBlock(renderChildren(element, context));
  }

  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnCount - row.length }, () => ''),
  ]);
  const header = normalizedRows[0];
  const separator = Array.from({ length: columnCount }, () => '---');
  return asBlock(
    [header, separator, ...normalizedRows.slice(1)]
      .map((row) => `| ${row.join(' | ')} |`)
      .join('\n'),
  );
}

function resolveSafeUrl(
  value: string | null,
  baseUrl: string,
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, baseUrl);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function wrapInline(marker: string, value: string): string {
  const { leading, core, trailing } = splitOuterWhitespace(value);
  return core ? `${leading}${marker}${core}${marker}${trailing}` : value;
}

function splitOuterWhitespace(value: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const remainder = value.slice(leading.length);
  const trailing = remainder.match(/\s*$/)?.[0] ?? '';
  return {
    leading,
    core: remainder.slice(0, remainder.length - trailing.length),
    trailing,
  };
}

function asBlock(value: string): string {
  const content = value.trim();
  return content ? `\n\n${content}\n\n` : '';
}

function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ');
}

function escapeMarkdown(value: string): string {
  return value
    .replace(/([\\`*_[\]<>~|])/g, '\\$1')
    .replace(/^(\s*)([#>=+-])/gm, '$1\\$2')
    .replace(/^(\s*)(\d+)\./gm, '$1$2\\.');
}

function escapeTablePipes(value: string): string {
  let output = '';
  let backslashCount = 0;

  for (const character of value) {
    if (character === '\\') {
      backslashCount += 1;
      output += character;
      continue;
    }
    if (character === '|' && backslashCount % 2 === 0) {
      output += '\\';
    }
    output += character;
    backslashCount = 0;
  }

  return output;
}

function cleanMarkdown(value: string): string {
  const output: string[] = [];
  let fenceLength = 0;
  let previousWasBlank = false;

  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    const fence = line.match(/^\s*(`{3,})/)?.[1];
    if (fenceLength > 0) {
      output.push(line);
      if (fence && fence.length >= fenceLength) {
        fenceLength = 0;
      }
      continue;
    }

    const normalized = line.replace(/[ \t]+$/g, '');
    if (fence) {
      output.push(normalized);
      fenceLength = fence.length;
      previousWasBlank = false;
      continue;
    }
    if (!normalized.trim()) {
      if (output.length > 0 && !previousWasBlank) {
        output.push('');
      }
      previousWasBlank = true;
      continue;
    }

    output.push(normalized);
    previousWasBlank = false;
  }

  return output.join('\n').trim();
}
