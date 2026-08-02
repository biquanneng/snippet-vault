// SPDX-License-Identifier: MPL-2.0

import { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Clock3,
  Copy,
  Globe2,
  LoaderCircle,
  Pencil,
  Pin,
  ShieldCheck,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import type {
  LabelSummary,
  SearchPanelItem,
} from '../../../lib/browser/message-contract';
import { toIntlLocale } from '../../../lib/i18n-catalog';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { HighlightedText } from './HighlightedText';
import { MarkdownContent } from './MarkdownContent';
import { findSearchHighlightRanges } from './search-highlight';

interface SearchResultItemProps {
  domId?: string;
  item: SearchPanelItem;
  listItemRef?: (node: HTMLLIElement | null) => void;
  portalContainer?: HTMLElement;
  query: string;
  selected?: boolean;
  selectedLabelId?: string;
  workspaceActionState?: {
    action: 'extend' | 'promote';
    itemId: string;
  } | null;
  workspaceExpiryDays?: number;
  workspaceLifecycleActionsEnabled?: boolean;
  onDelete: (item: SearchPanelItem) => void;
  onEdit: (item: SearchPanelItem) => void;
  onExtendWorkspaceItem?: (item: SearchPanelItem) => void;
  onLabelFilterToggle: (label: LabelSummary) => void;
  onPromoteWorkspaceItem?: (item: SearchPanelItem) => void;
  onSelect?: (itemId: string | undefined) => void;
}

export async function copySearchPanelItemContent(
  item: SearchPanelItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  try {
    await navigator.clipboard.writeText(item.content);
    return true;
  } catch {
    toast.error(t('search.results.copyFailed'));
    return false;
  }
}

export function SearchResultItem({
  domId,
  item,
  listItemRef,
  portalContainer,
  query,
  selected = false,
  selectedLabelId,
  workspaceActionState = null,
  workspaceExpiryDays = 0,
  workspaceLifecycleActionsEnabled = false,
  onDelete,
  onEdit,
  onExtendWorkspaceItem,
  onLabelFilterToggle,
  onPromoteWorkspaceItem,
  onSelect,
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
  const contextText = item.context?.name;
  const contextColor = item.context?.color;
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
  const workspaceActionPending =
    workspaceActionState?.itemId === item.id
      ? workspaceActionState.action
      : undefined;
  const workspaceActionsVisible =
    item.kind === 'workspace' && workspaceLifecycleActionsEnabled;

  async function handleCopy() {
    const didCopy = await copySearchPanelItemContent(item, t);
    if (didCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function handleDelete() {
    setDeleteOpen(false);
    onDelete(item);
  }

  return (
    <li
      id={domId}
      ref={listItemRef}
      className={cn(
        'group relative rounded-md bg-background px-3 py-3 text-foreground transition-colors hover:bg-muted/40',
        selected && 'bg-muted/50',
      )}
      data-selected={selected ? 'true' : undefined}
      role="option"
      aria-selected={selected}
      onFocusCapture={() => onSelect?.(item.id)}
    >
      <TooltipProvider>
        <div className="absolute right-2 bottom-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t(
                  copied ? 'search.results.copied' : 'search.results.copy',
                )}
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <Check className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              portalContainer={portalContainer}
              side="top"
              sideOffset={4}
            >
              {t(copied ? 'search.results.copied' : 'search.results.copy')}
            </TooltipContent>
          </Tooltip>
          <div className="flex items-center gap-0.5">
            {workspaceActionsVisible ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={workspaceActionState !== null}
                      aria-label={t(
                        'search.results.extendByDays',
                        [workspaceExpiryDays],
                        workspaceExpiryDays,
                      )}
                      onClick={() => onExtendWorkspaceItem?.(item)}
                    >
                      {workspaceActionPending === 'extend' ? (
                        <LoaderCircle
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <CalendarPlus className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    portalContainer={portalContainer}
                    side="top"
                    sideOffset={4}
                  >
                    {t(
                      'search.results.extendByDays',
                      [workspaceExpiryDays],
                      workspaceExpiryDays,
                    )}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={workspaceActionState !== null}
                      aria-label={t('search.results.promote')}
                      onClick={() => onPromoteWorkspaceItem?.(item)}
                    >
                      {workspaceActionPending === 'promote' ? (
                        <LoaderCircle
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <ShieldCheck className="size-4" aria-hidden="true" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    portalContainer={portalContainer}
                    side="top"
                    sideOffset={4}
                  >
                    {t('search.results.promote')}
                  </TooltipContent>
                </Tooltip>
              </>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('search.results.edit')}
                  onClick={() => onEdit(item)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                portalContainer={portalContainer}
                side="top"
                sideOffset={4}
              >
                {t('search.results.edit')}
              </TooltipContent>
            </Tooltip>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('search.results.delete')}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent
                  portalContainer={portalContainer}
                  side="top"
                  sideOffset={4}
                >
                  {t('search.results.delete')}
                </TooltipContent>
              </Tooltip>
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
        </div>
      </TooltipProvider>

      {hasSourceRow ? (
        <div
          className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
        >
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
          className="mt-1 block truncate font-mono text-xs text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-foreground"
        >
          <HighlightedText text={matchedSourceUrl} query={query} />
        </a>
      ) : null}

      {hasMetadata ? (
        <div
          className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
        >
          {item.labels.map((label) => {
            const localizedName = getLocalizedLabelName(
              label.id,
              label.name,
              locale,
            );
            const selected = selectedLabelId === label.id;
            return (
              <Badge
                key={label.id}
                asChild
                variant={selected ? 'default' : 'outline'}
                className="rounded-md"
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  title={localizedName}
                  onClick={() => onLabelFilterToggle(label)}
                >
                  <HighlightedText text={localizedName} query={query} />
                </button>
              </Badge>
            );
          })}
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

      <div>
        <MarkdownContent
          markdown={item.content}
          query={query}
          flush={!hasSourceRow && !hasMetadata}
        />
      </div>

      <div className="mt-2 flex justify-start text-xs text-muted-foreground">
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
