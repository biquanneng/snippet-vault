// SPDX-License-Identifier: MPL-2.0

import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import { getPageLinkUrl } from '../../../lib/page-link';

const MAX_SUMMARY_LENGTH = 160;
const CODE_FENCE = /^(`{3,}|~{3,})[\w+#.-]*$/;
const MARKDOWN_LINK = /!?\[([^\]]*)\]\([^)\s]*\)/g;

/**
 * One line that identifies a record in the result list. Stashed pages use the
 * page title; everything else uses its first meaningful line. Code fences are
 * skipped and `[text](url)` shows only its text; the preview and Enter keep
 * the content exactly as stored.
 */
export function getResultSummary(item: SearchPanelItem): string {
  if (getPageLinkUrl(item)) {
    return item.source?.title || item.source?.domain || item.content;
  }
  const lines = item.content
    .split('\n')
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const line = (lines.find((candidate) => !CODE_FENCE.test(candidate)) ??
    lines[0] ??
    '').replace(MARKDOWN_LINK, (match, text: string) => text || match);
  return line.length > MAX_SUMMARY_LENGTH
    ? `${line.slice(0, MAX_SUMMARY_LENGTH)}…`
    : line;
}

/** `https://a.com/x?token=…` → `a.com/x`; query strings may carry secrets. */
export function getDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${parsed.host}${path}`;
  } catch {
    return url;
  }
}

export type ResultContentType =
  | 'link'
  | 'connection'
  | 'credential'
  | 'command'
  | 'text';

const CREDENTIAL_LABEL_IDS = new Set([
  'ak',
  'sk',
  'password',
  'token',
  'api-key',
  'private-key',
  'public-key',
]);
// A deliberately short list: a false "command" is worse than plain text.
const COMMAND_PATTERN =
  /^(sudo|npx|pnpm|npm|yarn|bun|git|gh|docker|kubectl|helm|curl|wget|ssh|scp|brew|pip|uv|python3?|node|deno|go|cargo|make|terraform|aws|gcloud|az|wrangler|export|cd)\s\S[^\n]*$/;
// A long single token, such as an unprefixed AWS secret key.
const UNBROKEN_TOKEN = /^\S{20,}$/;

/** What a record holds, from its labels first and its content second. */
export function getResultContentType(item: SearchPanelItem): ResultContentType {
  if (getPageLinkUrl(item)) {
    return 'link';
  }
  const labelIds = item.labels.map((label) => label.id);
  if (labelIds.includes('connection-string')) {
    return 'connection';
  }
  if (labelIds.some((id) => CREDENTIAL_LABEL_IDS.has(id))) {
    return 'credential';
  }
  const content = item.content.trimStart();
  if (/^(```|~~~|\$ )/.test(content) || COMMAND_PATTERN.test(content)) {
    return 'command';
  }
  return 'text';
}

/** Code-shaped content reads in JetBrains Mono; prose and page titles do not. */
export function usesMonospace(item: SearchPanelItem): boolean {
  const type = getResultContentType(item);
  if (type === 'link') {
    return false;
  }
  return type !== 'text' || UNBROKEN_TOKEN.test(item.content.trim());
}
