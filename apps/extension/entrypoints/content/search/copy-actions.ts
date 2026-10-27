// SPDX-License-Identifier: MPL-2.0

import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import {
  formatAs,
  type CopyFormat,
  type CopyFormatFailureReason,
} from '../../../lib/copy-formats';
import type { TranslationKey } from '../../../lib/i18n-catalog';
import { getPageLinkUrl } from '../../../lib/page-link';

export const COPY_AS_FORMATS: readonly {
  format: Exclude<CopyFormat, 'raw'>;
  labelKey: TranslationKey;
}[] = [
  { format: 'shell-export', labelKey: 'search.copyFormats.shellExport' },
  { format: 'dotenv', labelKey: 'search.copyFormats.dotenv' },
  { format: 'json-field', labelKey: 'search.copyFormats.jsonField' },
  { format: 'http-header', labelKey: 'search.copyFormats.httpHeader' },
];

const FAILURE_KEYS: Record<CopyFormatFailureReason, TranslationKey> = {
  'invalid-variable-name': 'search.copyFormats.errors.invalidVariableName',
  'invalid-shell-value': 'search.copyFormats.errors.invalidShellValue',
  'invalid-dotenv-value': 'search.copyFormats.errors.invalidDotenvValue',
  'invalid-header-name': 'search.copyFormats.errors.invalidHeaderName',
  'invalid-header-value': 'search.copyFormats.errors.invalidHeaderValue',
};

export type CopyOutcome =
  | { ok: true }
  | { ok: false; errorKey: TranslationKey };

/** Stashed pages copy the full URL, not their Markdown link. */
export function getCopyText(item: SearchPanelItem): string {
  return getPageLinkUrl(item) ?? item.content;
}

export async function copyItem(
  item: SearchPanelItem,
  format: CopyFormat = 'raw',
): Promise<CopyOutcome> {
  const result =
    format === 'raw'
      ? { ok: true as const, text: getCopyText(item) }
      : formatAs(format, {
          name: toVariableName(item.labels[0]?.name),
          value: item.content,
        });
  if (!result.ok) {
    return { ok: false, errorKey: FAILURE_KEYS[result.reason] };
  }
  try {
    await navigator.clipboard.writeText(result.text);
    return { ok: true };
  } catch {
    return { ok: false, errorKey: 'search.results.copyFailed' };
  }
}

/** `api-key` → `API_KEY`; the suggested variable or header name. */
export function toVariableName(labelName: string | undefined): string | undefined {
  const normalized = labelName
    ?.trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return normalized && /^[A-Z_]/.test(normalized) ? normalized : undefined;
}
