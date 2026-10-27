// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import type {
  LabelSummary,
  SearchPanelItem,
} from '../../../lib/browser/message-contract';
import { useI18n } from '../../../lib/use-i18n';
import { HighlightedText } from './HighlightedText';
import { SearchResultPreview } from './SearchResultPreview';
import { SearchResultRow } from './SearchResultRow';
import { getSearchResultOptionId } from './search-result-selection';

export interface ResultSection {
  /** Domain heading for grouped Secrets results; omitted for flat lists. */
  title?: string;
  items: SearchPanelItem[];
}

interface SearchPanelResultsProps {
  sections: readonly ResultSection[];
  error: string | null;
  /** True only while there is nothing to show yet. */
  initialLoading: boolean;
  hasMore: boolean;
  query: string;
  resultsId: string;
  selectedItem?: SearchPanelItem;
  selectedLabelId?: string;
  emptyState: ReactNode;
  formatDateTime: (timestamp: number) => string;
  formatRelative: (item: SearchPanelItem) => string;
  onActivate: (item: SearchPanelItem) => void;
  onCopy: (item: SearchPanelItem) => Promise<boolean>;
  onLabelFilterToggle: (label: LabelSummary) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (item: SearchPanelItem) => void;
}

export function SearchPanelResults({
  sections,
  error,
  initialLoading,
  hasMore,
  query,
  resultsId,
  selectedItem,
  selectedLabelId,
  emptyState,
  formatDateTime,
  formatRelative,
  onActivate,
  onCopy,
  onLabelFilterToggle,
  onLoadMore,
  onRetry,
  onSelect,
}: SearchPanelResultsProps) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    listRef.current
      ?.querySelector(`#${CSS.escape(getSearchResultOptionId(resultsId, selectedItem.id))}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [resultsId, selectedItem]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasMore || !sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { root: listRef.current, rootMargin: '120px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, sections]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('search.results.failed')}</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('search.results.retry')}
        </Button>
      </div>
    );
  }

  if (initialLoading) {
    return <ResultsSkeleton label={t('search.results.loading')} />;
  }

  if (sections.every((section) => section.items.length === 0)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div
        ref={listRef}
        id={resultsId}
        role="listbox"
        aria-label={t('search.results.listLabel')}
        className="min-h-0 w-full overflow-y-auto overscroll-contain bg-surface p-2.5 sm:w-[46%] sm:shrink-0"
      >
        {sections.map((section, index) => (
          <ul
            key={section.title ?? index}
            role="group"
            aria-label={section.title}
            className={index > 0 ? 'mt-4' : undefined}
          >
            {section.title ? (
              <li
                role="presentation"
                className="truncate px-3 pt-1 pb-1.5 font-mono text-xs text-muted-foreground"
              >
                <HighlightedText text={section.title} query={query} />
              </li>
            ) : null}
            {section.items.map((item) => (
              <SearchResultRow
                key={item.id}
                domId={getSearchResultOptionId(resultsId, item.id)}
                item={item}
                query={query}
                selected={selectedItem?.id === item.id}
                relativeTime={formatRelative(item)}
                onSelect={() => onSelect(item)}
                onActivate={() => onActivate(item)}
              />
            ))}
          </ul>
        ))}
        {hasMore ? <div ref={sentinelRef} className="h-px" /> : null}
      </div>
      <div className="hidden min-w-0 flex-1 sm:flex">
        {selectedItem ? (
          <SearchResultPreview
            key={selectedItem.id}
            item={selectedItem}
            query={query}
            selectedLabelId={selectedLabelId}
            formatDateTime={formatDateTime}
            onCopy={() => onCopy(selectedItem)}
            onLabelFilterToggle={onLabelFilterToggle}
          />
        ) : null}
      </div>
    </div>
  );
}

function ResultsSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex-1 space-y-1 bg-surface p-2.5 sm:w-[46%]"
      aria-label={label}
      aria-live="polite"
    >
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-2" aria-hidden="true">
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
