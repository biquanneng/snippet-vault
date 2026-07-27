// SPDX-License-Identifier: MPL-2.0

import { useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  Copy,
  Globe2,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { ContextMarker } from '../../../components/context-marker';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import { getStoredContextColor } from '../../../lib/context-colors';
import { toIntlLocale } from '../../../lib/i18n-catalog';
import {
  getEnvironmentValue,
  getLocalizedEnvironmentName,
  getLocalizedLabelName,
} from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { HighlightedText } from './HighlightedText';
import { MarkdownContent } from './MarkdownContent';
import { findSearchHighlightRanges } from './search-highlight';

interface SearchResultItemProps {
  item: SearchPanelItem;
  portalContainer?: HTMLElement;
  query: string;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
}

export function SearchResultItem({
  item,
  portalContainer,
  query,
  onDelete,
  onEdit,
}: SearchResultItemProps) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const dateTimeFormatter = useMemo(
    () => new Intl.DateTimeFormat(toIntlLocale(locale), {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    [locale],
  );
  const environment = getEnvironmentValue(item.context);
  const contextText = environment
    ? getLocalizedEnvironmentName(environment, locale)
    : item.context;
  const contextColor = contextText
    ? getStoredContextColor(item.contextColor, item.context)
    : undefined;
  const sourceText =
    item.source?.title ?? item.source?.domain ?? item.source?.url;
  const matchedSourceUrl =
    item.source?.url &&
    findSearchHighlightRanges(item.source.url, query).length > 0
      ? item.source.url
      : undefined;
  const hasSourceRow =
    Boolean(sourceText) || (item.kind === 'vault' && item.pinned);
  const hasMetadata = item.labels.length > 0 || Boolean(contextText);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('search.results.copyFailed'));
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
    onDelete(item);
  }

  return (
    <li className="group relative bg-background px-3 py-3 text-foreground transition-colors hover:bg-muted/30">
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t(
            copied ? 'search.results.copied' : 'search.results.copy',
          )}
          title={t(
            copied ? 'search.results.copied' : 'search.results.copy',
          )}
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <Check className="size-3.5 text-primary" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t('search.results.edit')}
          title={t('search.results.edit')}
          onClick={() => onEdit(item)}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('search.results.delete')}
              title={t('search.results.delete')}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            portalContainer={portalContainer}
            size="sm"
            data-snippet-vault-ui="true"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{t('search.results.delete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('search.results.deleteConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('search.results.deleteCancel')}
              </AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                {t('search.results.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {hasSourceRow ? (
        <div className="flex min-w-0 items-center gap-1.5 pr-20 text-xs text-muted-foreground">
          {item.kind === 'vault' && item.pinned ? (
            <span className="flex size-5 items-center justify-center text-primary">
              <Pin
                className="size-3.5"
                aria-label={t('search.results.pinned')}
              />
            </span>
          ) : null}
          {sourceText ? (
            <>
              <Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
              {item.source?.url ? (
                <a
                  href={item.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-w-0 truncate underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
                  title={sourceText}
                >
                  <HighlightedText text={sourceText} query={query} />
                </a>
              ) : (
                <span className="min-w-0 truncate" title={sourceText}>
                  <HighlightedText text={sourceText} query={query} />
                </span>
              )}
            </>
          ) : null}
        </div>
      ) : null}

      {matchedSourceUrl && matchedSourceUrl !== sourceText ? (
        <a
          href={matchedSourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 block truncate pr-20 font-mono text-xs text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
        >
          <HighlightedText text={matchedSourceUrl} query={query} />
        </a>
      ) : null}

      {hasMetadata ? (
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pr-20">
          {item.labels.map((label) => (
            <Badge key={label.id} variant="secondary" className="rounded-md">
              <HighlightedText
                text={getLocalizedLabelName(
                  label.id,
                  label.name,
                  locale,
                )}
                query={query}
              />
            </Badge>
          ))}
          {contextText ? (
            <span
              className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
              aria-label={t('search.results.context', [contextText])}
              title={t('search.results.context', [contextText])}
            >
              {contextColor ? (
                <ContextMarker color={contextColor} />
              ) : null}
              <span className="truncate">
                <HighlightedText text={contextText} query={query} />
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={cn(!hasSourceRow && !hasMetadata && 'pr-20')}>
        <MarkdownContent markdown={item.content} query={query} />
      </div>

      <div className="mt-2 flex justify-end text-xs text-muted-foreground">
        <span className="flex shrink-0 items-center gap-1 tabular-nums">
          <Clock3 className="size-3.5" aria-hidden="true" />
          {item.kind === 'workspace'
            ? t('search.results.expires', [
                dateTimeFormatter.format(new Date(item.expiresAt)),
              ])
            : t('search.results.updated', [
                dateTimeFormatter.format(new Date(item.updatedAt)),
              ])}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? t('search.results.copied') : null}
      </span>
    </li>
  );
}
