// SPDX-License-Identifier: MPL-2.0

/**
 * A stashed page is stored as `[title](<url>)` with the same URL as its
 * source. The angle-bracket destination keeps URLs containing `)` intact, as
 * the selection serializer does. Such records copy and open the URL itself
 * rather than the Markdown.
 */
export function toPageLinkMarkdown(title: string | undefined, url: string): string {
  const label = (title ?? url).replace(/\\/g, '\\\\').replace(/[[\]]/g, '\\$&');
  return `[${label}](<${encodeDestination(url)}>)`;
}

export function getPageLinkUrl(item: {
  content: string;
  source?: { url?: string };
}): string | undefined {
  const url = item.source?.url;
  if (
    !url ||
    !/^https?:\/\//i.test(url) ||
    !item.content.startsWith('[') ||
    !item.content.endsWith(`](<${encodeDestination(url)}>)`)
  ) {
    return undefined;
  }
  return url;
}

function encodeDestination(url: string): string {
  return url.replaceAll('<', '%3C').replaceAll('>', '%3E');
}
