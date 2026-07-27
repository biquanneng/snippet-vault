// SPDX-License-Identifier: MPL-2.0

import type { Translator } from '../../../lib/i18n-catalog';

interface SearchMutationStatus {
  searchStatus: 'synchronized' | 'rebuild-required';
  labelStatus?: 'updated' | 'stale';
}

export function getMutationStatusMessages(
  status: SearchMutationStatus,
  t: Translator,
): string[] {
  return [
    status.searchStatus === 'rebuild-required'
      ? t('search.status.indexRebuild')
      : null,
    status.labelStatus === 'stale'
      ? t('search.status.labelOrderStale')
      : null,
  ].filter((message): message is string => message !== null);
}
