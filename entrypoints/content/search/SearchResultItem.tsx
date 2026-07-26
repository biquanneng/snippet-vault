// SPDX-License-Identifier: MPL-2.0

import { Clock3, Pin } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import { HighlightedText } from './HighlightedText';
import { MarkdownContent } from './MarkdownContent';
import { findSearchHighlightRanges } from './search-highlight';

interface SearchResultItemProps {
  item: SearchPanelItem;
  query: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const ENVIRONMENT_VARIANTS = {
  开发环境: 'outline',
  测试环境: 'outline',
  预发布环境: 'secondary',
  生产环境: 'destructive',
} as const;

export function SearchResultItem({
  item,
  query,
}: SearchResultItemProps) {
  const environmentVariant = getEnvironmentVariant(item.context);
  const matchedSourceUrl =
    item.source?.url &&
    findSearchHighlightRanges(item.source.url, query).length > 0
      ? item.source.url
      : undefined;
  const hasHeading =
    item.labels.length > 0 ||
    Boolean(environmentVariant) ||
    Boolean(item.source?.title) ||
    (item.kind === 'vault' && item.pinned);

  return (
    <li className="bg-background px-3 py-3 text-foreground transition-colors hover:bg-muted/30">
      {hasHeading ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {item.kind === 'vault' && item.pinned ? (
            <span className="flex size-5 items-center justify-center text-primary">
              <Pin className="size-3.5" aria-label="已固定" />
            </span>
          ) : null}
          {item.labels.map((label) => (
            <Badge key={label.id} variant="secondary" className="rounded-md">
              <HighlightedText text={label.name} query={query} />
            </Badge>
          ))}
          {item.context && environmentVariant ? (
            <Badge
              variant={environmentVariant}
              className="rounded-md font-normal"
            >
              <HighlightedText text={item.context} query={query} />
            </Badge>
          ) : null}
          {item.source?.title ? (
            item.source.url ? (
              <a
                href={item.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 truncate text-xs text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
              >
                <HighlightedText text={item.source.title} query={query} />
              </a>
            ) : (
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                <HighlightedText text={item.source.title} query={query} />
              </span>
            )
          ) : null}
        </div>
      ) : null}

      {matchedSourceUrl ? (
        <a
          href={matchedSourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 block truncate font-mono text-xs text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
        >
          <HighlightedText text={matchedSourceUrl} query={query} />
        </a>
      ) : null}

      <MarkdownContent markdown={item.content} query={query} />

      <div className="mt-2 flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
        {item.context && !environmentVariant ? (
          <p className="min-w-0 truncate">
            <HighlightedText text={item.context} query={query} />
          </p>
        ) : (
          <span />
        )}
        <span className="flex shrink-0 items-center gap-1 tabular-nums">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {item.kind === 'workspace'
            ? `到期 ${formatTimestamp(item.expiresAt)}`
            : `更新 ${formatTimestamp(item.updatedAt)}`}
        </span>
      </div>
    </li>
  );
}

function getEnvironmentVariant(
  context: string | undefined,
): (typeof ENVIRONMENT_VARIANTS)[keyof typeof ENVIRONMENT_VARIANTS] | undefined {
  if (!context) {
    return undefined;
  }
  return ENVIRONMENT_VARIANTS[
    context as keyof typeof ENVIRONMENT_VARIANTS
  ];
}

function formatTimestamp(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp));
}
