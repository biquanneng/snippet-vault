// SPDX-License-Identifier: MPL-2.0

import { forwardRef, type KeyboardEvent } from 'react';
import { LoaderCircle, Search, X } from 'lucide-react';

import { Input } from '../../../components/ui/input';
import { MAX_SEARCH_QUERY_LENGTH } from '../../../lib/browser/message-contract';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';

export type PanelScope = 'vault' | 'workspace' | 'tools';

export const PANEL_SCOPES: readonly PanelScope[] = ['vault', 'workspace', 'tools'];

interface SearchInputBarProps {
  scope: PanelScope;
  query: string;
  placeholder: string;
  loading: boolean;
  labelFilter?: string;
  activeDescendantId?: string;
  resultsId?: string;
  onScopeChange: (scope: PanelScope) => void;
  onQueryChange: (query: string) => void;
  onCompositionChange: (composing: boolean) => void;
  onClearLabelFilter: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** The search field is the panel's hero; scopes sit inside the same row. */
export const SearchInputBar = forwardRef<HTMLInputElement, SearchInputBarProps>(
  function SearchInputBar(
    {
      scope,
      query,
      placeholder,
      loading,
      labelFilter,
      activeDescendantId,
      resultsId,
      onScopeChange,
      onQueryChange,
      onCompositionChange,
      onClearLabelFilter,
      onKeyDown,
    },
    ref,
  ) {
    const { t } = useI18n();
    const scopeLabels: Record<PanelScope, string> = {
      vault: t('search.tabs.vault'),
      workspace: t('search.tabs.workspace'),
      tools: t('search.tabs.tools'),
    };

    return (
      <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
        {loading ? (
          <LoaderCircle
            className="size-4.5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <Search
            className="size-4.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {labelFilter ? (
          <button
            type="button"
            onClick={onClearLabelFilter}
            aria-label={t('search.filters.clearLabel')}
            title={t('search.filters.clearLabel')}
            className="flex shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 text-xs leading-6 hover:bg-accent"
          >
            {labelFilter}
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : null}
        <Input
          ref={ref}
          className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 md:text-base dark:bg-transparent"
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={resultsId}
          aria-expanded={Boolean(resultsId)}
          aria-activedescendant={activeDescendantId}
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          autoComplete="off"
          spellCheck={false}
          // Remounts when the snippet form closes; focus returns to search.
          autoFocus
          onChange={(event) => onQueryChange(event.target.value)}
          onCompositionStart={() => onCompositionChange(true)}
          onCompositionEnd={(event) => {
            onCompositionChange(false);
            onQueryChange(event.currentTarget.value);
          }}
          onKeyDown={onKeyDown}
        />
        <div
          role="tablist"
          aria-label={t('search.scopes.label')}
          className="flex shrink-0 items-center rounded-lg bg-muted p-0.5"
        >
          {PANEL_SCOPES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="tab"
              tabIndex={-1}
              aria-selected={scope === candidate}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onScopeChange(candidate)}
              className={cn(
                'rounded-md px-3 text-xs leading-7 font-medium transition-colors',
                scope === candidate
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {scopeLabels[candidate]}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
