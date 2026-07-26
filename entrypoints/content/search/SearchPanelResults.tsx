// SPDX-License-Identifier: MPL-2.0

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
  SearchPanelKind,
} from '../../../lib/browser/message-contract';
import { HighlightedText } from './HighlightedText';
import { groupVaultItemsByDomain } from './result-groups';
import { SearchPagination } from './SearchPagination';
import { SearchResultItem } from './SearchResultItem';

interface SearchPanelResultsProps {
  data: SearchPanelData | null;
  error: string | null;
  kind: SearchPanelKind;
  loading: boolean;
  query: string;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

export function SearchPanelResults({
  data,
  error,
  kind,
  loading,
  query,
  onPageChange,
  onRetry,
}: SearchPanelResultsProps) {
  if (loading) {
    return <SearchResultsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>检索失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="xs" onClick={onRetry}>
              重试
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
          {query ? '没有匹配结果' : '这里还没有记录'}
        </p>
        <p className="text-xs text-muted-foreground">
          {kind === 'vault'
            ? '保存带标签的网页选区后会出现在这里。'
            : '临时保存的内容会在到期前显示在这里。'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto overscroll-contain p-2">
        {kind === 'vault' ? (
          <VaultResults data={data} query={query} />
        ) : (
          <ul className="divide-y bg-background">
            {data.items.map((item) => (
              <SearchResultItem key={item.id} item={item} query={query} />
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
  query,
}: {
  data: SearchPanelData;
  query: string;
}) {
  const groups = groupVaultItemsByDomain(data.items);

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
              {group.items.length} 条
            </span>
          </div>
          <ul className="divide-y bg-background">
            {group.items.map((item) => (
              <SearchResultItem key={item.id} item={item} query={query} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SearchResultsSkeleton() {
  return (
    <div
      className="flex-1 space-y-6 overflow-hidden p-3"
      aria-label="正在检索"
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
