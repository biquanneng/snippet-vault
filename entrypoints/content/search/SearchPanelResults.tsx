// SPDX-License-Identifier: MPL-2.0

import { useMemo } from 'react';
import { AlertCircle, SearchX } from 'lucide-react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import type {
  SearchPanelData,
  SearchPanelItem,
  SearchPanelKind,
} from '../../../lib/browser/message-contract';
import { toIntlLocale } from '../../../lib/i18n-catalog';
import { useI18n } from '../../../lib/use-i18n';
import { HighlightedText } from './HighlightedText';
import { groupVaultItemsByDomain } from './result-groups';
import { SearchPagination } from './SearchPagination';
import { SearchResultItem } from './SearchResultItem';

interface SearchPanelResultsProps {
  data: SearchPanelData | null;
  error: string | null;
  kind: SearchPanelKind;
  loading: boolean;
  portalContainer?: HTMLElement;
  query: string;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

export function SearchPanelResults({
  data,
  error,
  kind,
  loading,
  portalContainer,
  query,
  onDelete,
  onEdit,
  onPageChange,
  onRetry,
}: SearchPanelResultsProps) {
  const { t } = useI18n();
  if (loading) {
    return (
      <SearchResultsSkeleton label={t('search.results.loading')} />
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{t('search.results.failed')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="xs" onClick={onRetry}>
              {t('search.results.retry')}
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (data.items.length === 0) {
    return (
      <div className="m-3 flex min-h-48 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="mb-1 flex size-9 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">
          {query
            ? t('search.results.noMatches')
            : t('search.results.noRecords')}
        </p>
        <p className="text-xs text-muted-foreground">
          {kind === 'vault'
            ? t('search.results.vaultEmpty')
            : t('search.results.workspaceEmpty')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
        {kind === 'vault' ? (
          <VaultResults
            data={data}
            portalContainer={portalContainer}
            query={query}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : (
          <ul className="divide-y bg-background">
            {data.items.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                portalContainer={portalContainer}
                query={query}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </ul>
        )}
      </div>
      {data.pagination ? (
        <SearchPagination
          pagination={data.pagination}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

function VaultResults({
  data,
  portalContainer,
  query,
  onDelete,
  onEdit,
}: {
  data: SearchPanelData;
  portalContainer?: HTMLElement;
  query: string;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
}) {
  const { locale, t } = useI18n();
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(toIntlLocale(locale)),
    [locale],
  );
  const groups = groupVaultItemsByDomain(
    data.items,
    t('search.results.unknownSource'),
  );

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section
          key={group.domain}
          aria-label={group.domain}
        >
          <div className="flex items-center gap-2 px-3 pb-1">
            <h2 className="min-w-0 truncate font-mono text-xs font-medium text-muted-foreground">
              <HighlightedText text={group.domain} query={query} />
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t(
                'search.results.groupCount',
                [numberFormatter.format(group.items.length)],
                group.items.length,
              )}
            </span>
          </div>
          <ul className="divide-y bg-background">
            {group.items.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                portalContainer={portalContainer}
                query={query}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SearchResultsSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex-1 space-y-6 overflow-hidden p-3"
      aria-label={label}
      aria-live="polite"
    >
      {[0, 1].map((group) => (
        <div key={group} className="space-y-3" aria-hidden="true">
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          <div className="space-y-3 px-3">
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
