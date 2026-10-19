// SPDX-License-Identifier: MPL-2.0

import { useEffect, useMemo, useRef } from 'react';
import { AlertCircle, SearchX } from 'lucide-react';

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import type {
  LabelSummary,
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
import { getSearchResultOptionId } from './search-result-selection';

interface SearchPanelResultsProps {
  data: SearchPanelData | null;
  error: string | null;
  kind: SearchPanelKind;
  loading: boolean;
  portalContainer?: HTMLElement;
  query: string;
  resultsId: string;
  selectedItemId?: string;
  selectedLabelId?: string;
  workspaceActionState: {
    action: 'extend' | 'promote';
    itemId: string;
  } | null;
  workspaceExpiryDays: number;
  workspaceLifecycleActionsEnabled: boolean;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
  onExtendWorkspaceItem: (item: SearchPanelItem) => void;
  onLabelFilterToggle: (label: LabelSummary) => void;
  onPageChange: (page: number) => void;
  onPromoteWorkspaceItem: (item: SearchPanelItem) => void;
  onRetry: () => void;
  onSelectedItemChange: (itemId: string | undefined) => void;
}

export function SearchPanelResults({
  data,
  error,
  kind,
  loading,
  portalContainer,
  query,
  resultsId,
  selectedItemId,
  selectedLabelId,
  workspaceActionState,
  workspaceExpiryDays,
  workspaceLifecycleActionsEnabled,
  onDelete,
  onEdit,
  onExtendWorkspaceItem,
  onLabelFilterToggle,
  onPageChange,
  onPromoteWorkspaceItem,
  onRetry,
  onSelectedItemChange,
}: SearchPanelResultsProps) {
  const { t } = useI18n();
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    if (!selectedItemId) {
      return;
    }
    itemRefs.current[selectedItemId]?.scrollIntoView({
      block: 'nearest',
    });
  }, [selectedItemId]);

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
            <Button variant="secondary" size="xs" onClick={onRetry}>
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
      <div
        id={resultsId}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2"
        role="listbox"
        aria-label={t('search.results.listLabel')}
      >
        {kind === 'vault' && query ? (
          <VaultResults
            data={data}
            portalContainer={portalContainer}
            query={query}
            resultsId={resultsId}
            itemRefs={itemRefs.current}
            selectedItemId={selectedItemId}
            selectedLabelId={selectedLabelId}
            onDelete={onDelete}
            onEdit={onEdit}
            onLabelFilterToggle={onLabelFilterToggle}
            onSelectedItemChange={onSelectedItemChange}
          />
        ) : (
          <ul className="divide-y bg-background" role="presentation">
            {data.items.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                portalContainer={portalContainer}
                query={query}
                domId={getSearchResultOptionId(resultsId, item.id)}
                selected={selectedItemId === item.id}
                selectedLabelId={selectedLabelId}
                workspaceActionState={workspaceActionState}
                workspaceExpiryDays={workspaceExpiryDays}
                workspaceLifecycleActionsEnabled={
                  workspaceLifecycleActionsEnabled
                }
                onDelete={onDelete}
                onEdit={onEdit}
                onExtendWorkspaceItem={onExtendWorkspaceItem}
                onLabelFilterToggle={onLabelFilterToggle}
                onPromoteWorkspaceItem={onPromoteWorkspaceItem}
                onSelect={onSelectedItemChange}
                listItemRef={(node) => {
                  itemRefs.current[item.id] = node;
                }}
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
  itemRefs,
  portalContainer,
  query,
  resultsId,
  selectedItemId,
  selectedLabelId,
  onDelete,
  onEdit,
  onLabelFilterToggle,
  onSelectedItemChange,
}: {
  data: SearchPanelData;
  itemRefs: Record<string, HTMLLIElement | null>;
  portalContainer?: HTMLElement;
  query: string;
  resultsId: string;
  selectedItemId?: string;
  selectedLabelId?: string;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
  onLabelFilterToggle: (label: LabelSummary) => void;
  onSelectedItemChange: (itemId: string | undefined) => void;
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
          role="group"
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
          <ul className="divide-y bg-background" role="presentation">
            {group.items.map((item) => (
              <SearchResultItem
                key={item.id}
                item={item}
                portalContainer={portalContainer}
                query={query}
                domId={getSearchResultOptionId(resultsId, item.id)}
                selected={selectedItemId === item.id}
                selectedLabelId={selectedLabelId}
                onDelete={onDelete}
                onEdit={onEdit}
                onLabelFilterToggle={onLabelFilterToggle}
                onSelect={onSelectedItemChange}
                listItemRef={(node) => {
                  itemRefs[item.id] = node;
                }}
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
