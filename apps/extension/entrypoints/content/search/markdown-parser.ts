// SPDX-License-Identifier: MPL-2.0

export type MarkdownInline =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'break';
    }
  | {
      type: 'code';
      value: string;
    }
  | {
      type: 'strong' | 'emphasis' | 'delete';
      children: MarkdownInline[];
    }
  | {
      type: 'link';
      href: string;
      children: MarkdownInline[];
    }
  | {
      type: 'image-alt';
      children: MarkdownInline[];
    };

export type MarkdownBlock =
  | {
      type: 'paragraph';
      children: MarkdownInline[];
    }
  | {
      type: 'heading';
      level: number;
      children: MarkdownInline[];
    }
  | {
      type: 'code';
      language?: string;
      value: string;
    }
  | {
      type: 'blockquote';
      children: MarkdownBlock[];
    }
  | {
      type: 'list';
      ordered: boolean;
      start?: number;
      items: MarkdownBlock[][];
    }
  | {
      type: 'table';
      header: MarkdownInline[][];
      rows: MarkdownInline[][][];
    }
  | {
      type: 'separator';
    };

interface InlineParseResult {
  nodes: MarkdownInline[];
  position: number;
  closed: boolean;
}

interface InlineDelimiter {
  marker: '*' | '_' | '~';
  width: 1 | 2;
}

interface ListMarker {
  indentation: number;
  marker: string;
  content: string;
  ordered: boolean;
  start?: number;
}

const LIST_ITEM_PATTERN = /^(\s*)([-+*]|\d+[.)])\s+(.*)$/;
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.+)$/;
const FENCE_PATTERN = /^\s{0,3}(`{3,})([\w+-]*)\s*$/;

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  return parseBlocks(markdown.replace(/\r\n?/g, '\n').split('\n'));
}

export function parseMarkdownInline(value: string): MarkdownInline[] {
  return parseInlineRange(value, 0).nodes;
}

function parseBlocks(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const fence = lines[index].match(FENCE_PATTERN);
    if (fence) {
      const parsed = parseCodeBlock(lines, index, fence);
      blocks.push(parsed.block);
      index = parsed.nextIndex;
      continue;
    }

    const heading = lines[index].match(HEADING_PATTERN);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        children: parseMarkdownInline(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    if (/^\s{0,3}>\s?/.test(lines[index])) {
      const quoted: string[] = [];
      while (index < lines.length) {
        const match = lines[index].match(/^\s{0,3}>\s?(.*)$/);
        if (!match) {
          break;
        }
        quoted.push(match[1]);
        index += 1;
      }
      blocks.push({
        type: 'blockquote',
        children: parseBlocks(quoted),
      });
      continue;
    }

    const listMarker = readListMarker(lines[index]);
    if (listMarker) {
      const parsed = parseList(lines, index, listMarker);
      blocks.push(parsed.block);
      index = parsed.nextIndex;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    if (isSeparator(lines[index])) {
      blocks.push({ type: 'separator' });
      index += 1;
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      (paragraph.length === 0 || !startsBlock(lines, index))
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({
      type: 'paragraph',
      children: parseMarkdownInline(paragraph.join('\n')),
    });
  }

  return blocks;
}

function parseCodeBlock(
  lines: string[],
  startIndex: number,
  opening: RegExpMatchArray,
): { block: MarkdownBlock; nextIndex: number } {
  const fenceLength = opening[1].length;
  const language = opening[2] || undefined;
  const content: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const closing = lines[index].match(/^\s{0,3}(`{3,})\s*$/);
    if (closing && closing[1].length >= fenceLength) {
      index += 1;
      break;
    }
    content.push(lines[index]);
    index += 1;
  }

  return {
    block: {
      type: 'code',
      ...(language ? { language } : {}),
      value: content.join('\n'),
    },
    nextIndex: index,
  };
}

function parseList(
  lines: string[],
  startIndex: number,
  firstMarker: ListMarker,
): { block: MarkdownBlock; nextIndex: number } {
  const items: MarkdownBlock[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const marker = readListMarker(lines[index]);
    if (
      !marker ||
      marker.indentation !== firstMarker.indentation ||
      marker.ordered !== firstMarker.ordered
    ) {
      break;
    }

    const itemLines = [marker.content];
    const contentIndent =
      marker.indentation + marker.marker.length + 1;
    index += 1;

    while (index < lines.length) {
      const nextMarker = readListMarker(lines[index]);
      if (
        nextMarker &&
        nextMarker.indentation === firstMarker.indentation &&
        nextMarker.ordered === firstMarker.ordered
      ) {
        break;
      }

      if (!lines[index].trim()) {
        const nextContentIndex = findNextNonBlankLine(lines, index + 1);
        if (nextContentIndex === -1) {
          index = lines.length;
          break;
        }
        const nextIndent = countLeadingSpaces(lines[nextContentIndex]);
        const continuesItem =
          nextIndent > firstMarker.indentation ||
          Boolean(
            readListMarker(lines[nextContentIndex])?.indentation ===
              firstMarker.indentation,
          );
        if (!continuesItem) {
          index += 1;
          break;
        }
        itemLines.push('');
        index += 1;
        continue;
      }

      const indentation = countLeadingSpaces(lines[index]);
      if (indentation <= firstMarker.indentation) {
        break;
      }
      itemLines.push(lines[index].slice(Math.min(contentIndent, indentation)));
      index += 1;
    }

    const itemBlocks = parseBlocks(itemLines);
    items.push(
      itemBlocks.length > 0
        ? itemBlocks
        : [{ type: 'paragraph', children: [] }],
    );
  }

  return {
    block: {
      type: 'list',
      ordered: firstMarker.ordered,
      ...(firstMarker.start !== undefined
        ? { start: firstMarker.start }
        : {}),
      items,
    },
    nextIndex: index,
  };
}

function parseTable(
  lines: string[],
  startIndex: number,
): { block: MarkdownBlock; nextIndex: number } | null {
  if (startIndex + 1 >= lines.length) {
    return null;
  }

  const header = splitTableRow(lines[startIndex]);
  const separator = splitTableRow(lines[startIndex + 1]);
  if (
    !header ||
    !separator ||
    header.length !== separator.length ||
    !separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))
  ) {
    return null;
  }

  const rows: MarkdownInline[][][] = [];
  let index = startIndex + 2;
  while (index < lines.length && lines[index].trim()) {
    const row = splitTableRow(lines[index]);
    if (!row) {
      break;
    }
    rows.push(
      Array.from({ length: header.length }, (_, cellIndex) =>
        parseMarkdownInline(row[cellIndex]?.trim() ?? ''),
      ),
    );
    index += 1;
  }

  return {
    block: {
      type: 'table',
      header: header.map((cell) => parseMarkdownInline(cell.trim())),
      rows,
    },
    nextIndex: index,
  };
}

function splitTableRow(line: string): string[] | null {
  if (!line.includes('|')) {
    return null;
  }

  const cells: string[] = [];
  let current = '';
  let escaped = false;
  for (const character of line) {
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (escaped) {
    current += '\\';
  }
  cells.push(current);

  if (!cells[0].trim()) {
    cells.shift();
  }
  if (!cells.at(-1)?.trim()) {
    cells.pop();
  }
  return cells.length > 0 ? cells : null;
}

function startsBlock(lines: string[], index: number): boolean {
  const line = lines[index];
  return (
    FENCE_PATTERN.test(line) ||
    HEADING_PATTERN.test(line) ||
    /^\s{0,3}>\s?/.test(line) ||
    Boolean(readListMarker(line)) ||
    Boolean(parseTable(lines, index)) ||
    isSeparator(line)
  );
}

function isSeparator(line: string): boolean {
  const value = line.trim();
  return (
    /^(?:-\s*){3,}$/.test(value) ||
    /^(?:\*\s*){3,}$/.test(value) ||
    /^(?:_\s*){3,}$/.test(value)
  );
}

function readListMarker(line: string): ListMarker | null {
  const match = line.match(LIST_ITEM_PATTERN);
  if (!match) {
    return null;
  }

  const ordered = /^\d/.test(match[2]);
  const start = ordered ? Number.parseInt(match[2], 10) : undefined;
  return {
    indentation: match[1].length,
    marker: match[2],
    content: match[3],
    ordered,
    ...(start !== undefined ? { start } : {}),
  };
}

function findNextNonBlankLine(lines: string[], start: number): number {
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].trim()) {
      return index;
    }
  }
  return -1;
}

function countLeadingSpaces(value: string): number {
  return value.match(/^ */)?.[0].length ?? 0;
}

function parseInlineRange(
  value: string,
  start: number,
  closing?: InlineDelimiter,
): InlineParseResult {
  const nodes: MarkdownInline[] = [];
  let position = start;

  while (position < value.length) {
    if (
      value[position] === '\\' &&
      position + 1 < value.length &&
      /[\\`*_[\]{}()#+\-.!<>~|]/.test(value[position + 1])
    ) {
      appendText(nodes, value[position + 1]);
      position += 2;
      continue;
    }

    if (value[position] === '\n') {
      nodes.push({ type: 'break' });
      position += 1;
      continue;
    }

    if (value.slice(position, position + 4).toLowerCase() === '<br>') {
      nodes.push({ type: 'break' });
      position += 4;
      continue;
    }

    if (value[position] === '`') {
      const parsed = parseInlineCode(value, position);
      if (parsed) {
        nodes.push({ type: 'code', value: parsed.value });
        position = parsed.nextPosition;
        continue;
      }
    }

    const link = parseLink(value, position);
    if (link) {
      nodes.push(link.node);
      position = link.nextPosition;
      continue;
    }

    const marker = readInlineMarker(value, position);
    if (marker) {
      if (
        closing &&
        marker.marker === closing.marker &&
        marker.width >= closing.width &&
        isClosingDelimiter(value, position, marker.marker)
      ) {
        return {
          nodes,
          position: position + closing.width,
          closed: true,
        };
      }

      const canOpen = isOpeningDelimiter(
        value,
        position,
        marker.width,
        marker.marker,
      );
      if (canOpen) {
        const width: 1 | 2 =
          marker.marker === '~' || marker.width >= 2 ? 2 : 1;
        const child = parseInlineRange(value, position + width, {
          marker: marker.marker,
          width,
        });
        if (child.closed) {
          nodes.push({
            type:
              marker.marker === '~'
                ? 'delete'
                : width === 2
                  ? 'strong'
                  : 'emphasis',
            children: child.nodes,
          });
          position = child.position;
          continue;
        }

        appendText(nodes, marker.marker.repeat(width));
        nodes.push(...child.nodes);
        position = child.position;
        continue;
      }
    }

    appendText(nodes, value[position]);
    position += 1;
  }

  return { nodes, position, closed: false };
}

function parseInlineCode(
  value: string,
  start: number,
): { value: string; nextPosition: number } | null {
  const opening = value.slice(start).match(/^`+/)?.[0];
  if (!opening) {
    return null;
  }

  const closingIndex = value.indexOf(opening, start + opening.length);
  if (closingIndex === -1) {
    return null;
  }

  let content = value.slice(start + opening.length, closingIndex);
  if (
    content.startsWith(' ') &&
    content.endsWith(' ') &&
    content.trim()
  ) {
    content = content.slice(1, -1);
  }
  return {
    value: content.replace(/\s*\n\s*/g, ' '),
    nextPosition: closingIndex + opening.length,
  };
}

function parseLink(
  value: string,
  start: number,
): { node: MarkdownInline; nextPosition: number } | null {
  const image = value.startsWith('![', start);
  const labelStart = start + (image ? 2 : 1);
  if ((!image && value[start] !== '[') || labelStart >= value.length) {
    return null;
  }

  const labelEnd = findUnescaped(value, ']', labelStart);
  if (labelEnd === -1 || value[labelEnd + 1] !== '(') {
    return null;
  }

  const destinationStart = labelEnd + 2;
  let destinationEnd: number;
  let nextPosition: number;
  if (value[destinationStart] === '<') {
    destinationEnd = findUnescaped(value, '>', destinationStart + 1);
    if (destinationEnd === -1 || value[destinationEnd + 1] !== ')') {
      return null;
    }
    nextPosition = destinationEnd + 2;
  } else {
    destinationEnd = findUnescaped(value, ')', destinationStart);
    if (destinationEnd === -1) {
      return null;
    }
    nextPosition = destinationEnd + 1;
  }

  const label = value.slice(labelStart, labelEnd);
  const destination = value.slice(
    destinationStart + (value[destinationStart] === '<' ? 1 : 0),
    destinationEnd,
  );
  const children = parseMarkdownInline(label);
  if (image) {
    return {
      node: { type: 'image-alt', children },
      nextPosition,
    };
  }

  const href = resolveSafeLink(destination);
  if (!href) {
    return null;
  }
  return {
    node: {
      type: 'link',
      href,
      children,
    },
    nextPosition,
  };
}

function resolveSafeLink(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function findUnescaped(
  value: string,
  character: string,
  start: number,
): number {
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === '\\') {
      index += 1;
      continue;
    }
    if (value[index] === character) {
      return index;
    }
  }
  return -1;
}

function readInlineMarker(
  value: string,
  position: number,
): InlineDelimiter | null {
  const marker = value[position];
  if (marker !== '*' && marker !== '_' && marker !== '~') {
    return null;
  }

  let width = 1;
  while (value[position + width] === marker) {
    width += 1;
  }
  if (marker === '~' && width < 2) {
    return null;
  }
  return {
    marker,
    width: Math.min(2, width) as 1 | 2,
  };
}

function isOpeningDelimiter(
  value: string,
  position: number,
  width: number,
  marker: InlineDelimiter['marker'],
): boolean {
  const previous = value[position - 1];
  const next = value[position + width];
  if (
    marker === '_' &&
    previous &&
    next &&
    /[\p{L}\p{N}]/u.test(previous) &&
    /[\p{L}\p{N}]/u.test(next)
  ) {
    return false;
  }
  return Boolean(next && !/\s/.test(next));
}

function isClosingDelimiter(
  value: string,
  position: number,
  marker: InlineDelimiter['marker'],
): boolean {
  const previous = value[position - 1];
  const next = value[position + 1];
  if (
    marker === '_' &&
    previous &&
    next &&
    /[\p{L}\p{N}]/u.test(previous) &&
    /[\p{L}\p{N}]/u.test(next)
  ) {
    return false;
  }
  return Boolean(previous && !/\s/.test(previous));
}

function appendText(nodes: MarkdownInline[], value: string): void {
  const previous = nodes.at(-1);
  if (previous?.type === 'text') {
    previous.value += value;
  } else {
    nodes.push({ type: 'text', value });
  }
}
