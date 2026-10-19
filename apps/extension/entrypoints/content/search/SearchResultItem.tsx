// SPDX-License-Identifier: MPL-2.0

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Clock3,
  Copy,
  Globe2,
  LoaderCircle,
  Pencil,
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
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
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
  const sourceText =
    item.source?.title ?? item.source?.domain ?? item.source?.url;
  const matchedSourceUrl =
    item.source?.url &&
    findSearchHighlightRanges(item.source.url, query).length > 0
      ? item.source.url
      : undefined;
  const workspaceActionPending =
    workspaceActionState?.itemId === item.id
      ? workspaceActionState.action
      : undefined;
  const workspaceActionsVisible =
    item.kind === 'workspace' && workspaceLifecycleActionsEnabled;

  useEffect(() => {
    const content = contentRef.current;
    if (!content || expanded) {
      return;
    }
    const measure = () =>
      setOverflowing(content.scrollHeight > content.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [expanded, item.content]);

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
        'group relative bg-background py-3 text-foreground',
        // The selection bar sits in the list's side gutter so the text keeps
        // its alignment.
        selected &&
          'before:absolute before:inset-y-3 before:-left-2 before:w-0.5 before:rounded-full before:bg-primary',
      )}
      data-selected={selected ? 'true' : undefined}
      role="option"
      aria-selected={selected}
      onFocusCapture={() => onSelect?.(item.id)}
    >
      <div
        ref={contentRef}
        id={contentId}
        className={cn(
          !expanded && 'max-h-24 overflow-hidden',
          !expanded && overflowing && 'mask-b-from-60%',
        )}
      >
        <MarkdownContent markdown={item.content} query={query} flush />
      </div>
      {overflowing || expanded ? (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((current) => !current)}
        >
          {t(expanded ? 'search.results.collapse' : 'search.results.expand')}
        </button>
      ) : null}

      <div className="mt-2 flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
          {sourceText ? (
            // Long page titles would push the timestamp and actions to a new
            // line; cap the width and keep the full title in `title`.
            <span className="flex max-w-64 min-w-0 items-center gap-1">
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
            </span>
          ) : null}
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
          {/* Right after the timestamp so the actions sit near the content
              instead of the far edge of a wide panel. */}
          <TooltipProvider>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 group-data-[selected=true]:opacity-100">
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
        </div>
      </div>

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

      <span className="sr-only" aria-live="polite">
        {copied ? t('search.results.copied') : null}
      </span>
    </li>
  );
}
