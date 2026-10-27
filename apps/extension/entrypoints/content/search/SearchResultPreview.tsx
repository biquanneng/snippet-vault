// SPDX-License-Identifier: MPL-2.0

import { useState, type ReactNode } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import type {
  LabelSummary,
  SearchPanelItem,
} from '../../../lib/browser/message-contract';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { getPageLinkUrl } from '../../../lib/page-link';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { HighlightedText } from './HighlightedText';
import {
  getDisplayUrl,
  getResultSummary,
  usesMonospace,
} from './result-summary';

interface SearchResultPreviewProps {
  item: SearchPanelItem;
  query: string;
  selectedLabelId?: string;
  formatDateTime: (timestamp: number) => string;
  onCopy: () => Promise<boolean>;
  onLabelFilterToggle: (label: LabelSummary) => void;
}

export function SearchResultPreview({
  item,
  query,
  selectedLabelId,
  formatDateTime,
  onCopy,
  onLabelFilterToggle,
}: SearchResultPreviewProps) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const pageLinkUrl = getPageLinkUrl(item);
  const sourceText = item.source?.title || item.source?.domain;

  async function copy() {
    if (await onCopy()) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <article className="flex min-h-0 flex-1 flex-col gap-7 overflow-y-auto overscroll-contain px-7 py-6">
      {/* Only a page link has a title that differs from its content. */}
      {pageLinkUrl ? (
        <h3 className="text-base leading-6 font-medium break-words">
          <HighlightedText text={getResultSummary(item)} query={query} />
        </h3>
      ) : null}

      <div className="group/content relative rounded-lg bg-muted/60 px-4 py-3.5">
        {pageLinkUrl ? (
          <p className="pr-8 font-mono text-[13px] leading-6 break-words">
            {getDisplayUrl(pageLinkUrl)}
          </p>
        ) : (
          // Shown exactly as stored, so what you see is what Enter copies.
          <pre
            className={cn(
              'pr-8 leading-6 break-words whitespace-pre-wrap',
              usesMonospace(item) ? 'font-mono text-[13px]' : 'font-sans text-sm',
            )}
          >
            <HighlightedText text={item.content} query={query} />
          </pre>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-2 right-2 text-muted-foreground"
          aria-label={t(copied ? 'search.results.copied' : 'search.results.copy')}
          title={t(copied ? 'search.results.copied' : 'search.results.copy')}
          onClick={() => void copy()}
        >
          {copied ? (
            <Check className="text-foreground" aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
        </Button>
      </div>

      <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-3.5 text-xs leading-5">
        {sourceText ? (
          <Field term={t('search.preview.source')}>
            {item.source?.url ? (
              <a
                href={item.source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex max-w-full items-center gap-1 text-foreground underline-offset-2 hover:underline"
              >
                <span className="truncate">
                  <HighlightedText text={sourceText} query={query} />
                </span>
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-foreground">{sourceText}</span>
            )}
          </Field>
        ) : null}
        {item.labels.length > 0 ? (
          <Field term={t('search.preview.labels')}>
            <span className="flex flex-wrap gap-1">
              {item.labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={selectedLabelId === label.id}
                  title={t('search.preview.filterByLabel')}
                  onClick={() => onLabelFilterToggle(label)}
                  className={cn(
                    'rounded-sm px-1.5 leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    selectedLabelId === label.id
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground hover:bg-accent',
                  )}
                >
                  <HighlightedText
                    text={getLocalizedLabelName(label.id, label.name, locale)}
                    query={query}
                  />
                </button>
              ))}
            </span>
          </Field>
        ) : null}
        {item.kind === 'workspace' ? (
          <Field term={t('search.preview.expires')}>
            <span className="text-foreground tabular-nums">
              {formatDateTime(item.expiresAt)}
            </span>
          </Field>
        ) : null}
        <Field term={t('search.preview.updated')}>
          <span className="tabular-nums">{formatDateTime(item.updatedAt)}</span>
        </Field>
        <Field term={t('search.preview.created')}>
          <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>
        </Field>
      </dl>
    </article>
  );
}

function Field({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 text-muted-foreground">{children}</dd>
    </>
  );
}
