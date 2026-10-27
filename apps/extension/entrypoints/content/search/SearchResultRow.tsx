// SPDX-License-Identifier: MPL-2.0

import type { LucideIcon } from 'lucide-react';
import {
  Database,
  FileText,
  KeyRound,
  Link2,
  SquareTerminal,
} from 'lucide-react';

import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { HighlightedText } from './HighlightedText';
import {
  getResultContentType,
  getResultSummary,
  usesMonospace,
  type ResultContentType,
} from './result-summary';

const RESULT_ICONS: Record<ResultContentType, LucideIcon> = {
  link: Link2,
  connection: Database,
  credential: KeyRound,
  command: SquareTerminal,
  text: FileText,
};

interface SearchResultRowProps {
  domId: string;
  item: SearchPanelItem;
  query: string;
  selected: boolean;
  relativeTime: string;
  onSelect: () => void;
  onActivate: () => void;
}

/** One dense, two-line row; every action lives in the keyboard or ⌘K. */
export function SearchResultRow({
  domId,
  item,
  query,
  selected,
  relativeTime,
  onSelect,
  onActivate,
}: SearchResultRowProps) {
  const { locale } = useI18n();
  const Icon = RESULT_ICONS[getResultContentType(item)];
  const monospace = usesMonospace(item);
  const sourceText = item.source?.title || item.source?.domain;

  return (
    <li
      id={domId}
      role="option"
      aria-selected={selected}
      data-selected={selected}
      className={cn(
        'flex cursor-default items-center gap-3.5 rounded-lg px-3.5 py-3 select-none',
        selected ? 'bg-brand/10 dark:bg-brand/15' : 'hover:bg-muted/70',
      )}
      onMouseDown={(event) => {
        // Keep focus in the search field so the keyboard keeps working.
        event.preventDefault();
        onSelect();
      }}
      onDoubleClick={onActivate}
    >
      <span
        className={cn(
          'flex w-5 shrink-0 justify-center',
          selected ? 'text-brand-strong' : 'text-muted-foreground',
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm text-foreground',
            monospace && 'font-mono text-[13px]',
          )}
        >
          <HighlightedText text={getResultSummary(item)} query={query} />
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {sourceText ? (
            <span className="min-w-0 truncate">
              <HighlightedText text={sourceText} query={query} />
            </span>
          ) : null}
          {sourceText && item.labels.length > 0 ? (
            <span className="shrink-0" aria-hidden="true">
              ·
            </span>
          ) : null}
          {item.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="max-w-28 shrink-0 truncate rounded-sm border px-1 leading-4"
            >
              {getLocalizedLabelName(label.id, label.name, locale)}
            </span>
          ))}
        </span>
      </span>
      <span className="shrink-0 self-start pt-0.5 text-xs tabular-nums text-muted-foreground">
        {relativeTime}
      </span>
    </li>
  );
}
