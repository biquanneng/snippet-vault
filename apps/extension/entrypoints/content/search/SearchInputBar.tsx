// SPDX-License-Identifier: MPL-2.0

import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Kbd } from '../../../components/ui/kbd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import {
  MAX_SEARCH_QUERY_LENGTH,
  type SearchPanelKind,
} from '../../../lib/browser/message-contract';
import { useI18n } from '../../../lib/use-i18n';

interface SearchInputBarProps {
  disabled?: boolean;
  kind: SearchPanelKind;
  query: string;
  activeDescendantId?: string;
  hasActiveResult?: boolean;
  portalContainer?: HTMLElement;
  resultsAvailable?: boolean;
  resultsId?: string;
  resultActionsEnabled?: boolean;
  onClear: () => void;
  onNavigateResults?: (direction: -1 | 1) => void;
  onOpenSelectedResult?: () => void;
  onSelectResultPrimaryAction?: () => void;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}

export const SearchInputBar = forwardRef<
  HTMLInputElement,
  SearchInputBarProps
>(function SearchInputBar(
  {
    disabled = false,
    kind,
    query,
    activeDescendantId,
    hasActiveResult = false,
    portalContainer,
    resultsAvailable = false,
    resultsId,
    resultActionsEnabled = false,
    onClear,
    onNavigateResults,
    onOpenSelectedResult,
    onSelectResultPrimaryAction,
    onQueryChange,
    onSearch,
  },
  ref,
) {
  const { t } = useI18n();
  const placeholder =
    kind === 'vault'
      ? t('search.input.vault')
      : t('search.input.workspace');

  return (
    <div className="relative flex h-14 items-center">
      <Search
        className="pointer-events-none absolute left-1 size-5 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        className="h-14 rounded-none border-0 bg-transparent pr-20 pl-9 text-base shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 md:text-base dark:bg-transparent"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) {
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!resultActionsEnabled) {
              return;
            }
            event.preventDefault();
            onNavigateResults?.(event.key === 'ArrowDown' ? 1 : -1);
            return;
          }
          if (event.key !== 'Enter') {
            return;
          }
          if (hasActiveResult && resultActionsEnabled) {
            event.preventDefault();
            if (event.metaKey || event.ctrlKey) {
              onOpenSelectedResult?.();
              return;
            }
            if (!event.altKey && !event.shiftKey) {
              onSelectResultPrimaryAction?.();
            }
            return;
          }
          if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
          }
          event.preventDefault();
          onSearch(event.currentTarget.value);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-autocomplete="none"
        aria-controls={resultsId}
        aria-expanded={resultsAvailable}
        aria-activedescendant={activeDescendantId}
        disabled={disabled}
        maxLength={MAX_SEARCH_QUERY_LENGTH}
        autoComplete="off"
        spellCheck={false}
      />
      {!query ? (
        <span className="pointer-events-none absolute right-2 flex items-center gap-1">
          <Kbd>Enter</Kbd>
        </span>
      ) : null}
      {query ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 text-muted-foreground hover:text-foreground"
                disabled={disabled}
                onClick={onClear}
                aria-label={t('search.input.clear')}
              >
                <X aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              portalContainer={portalContainer}
              side="top"
              sideOffset={4}
            >
              {t('search.input.clear')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
});
