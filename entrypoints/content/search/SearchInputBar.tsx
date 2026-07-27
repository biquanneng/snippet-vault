// SPDX-License-Identifier: MPL-2.0

import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  MAX_SEARCH_QUERY_LENGTH,
  type SearchPanelKind,
} from '../../../lib/browser/message-contract';
import { useI18n } from '../../../lib/use-i18n';

interface SearchInputBarProps {
  disabled?: boolean;
  kind: SearchPanelKind;
  query: string;
  onClear: () => void;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}

export const SearchInputBar = forwardRef<
  HTMLInputElement,
  SearchInputBarProps
>(function SearchInputBar(
  { disabled = false, kind, query, onClear, onQueryChange, onSearch },
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
        className="h-14 rounded-none border-0 bg-transparent pr-10 pl-9 text-base shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 md:text-base dark:bg-transparent"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
            return;
          }
          event.preventDefault();
          onSearch(event.currentTarget.value);
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        maxLength={MAX_SEARCH_QUERY_LENGTH}
        autoComplete="off"
        spellCheck={false}
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          onClick={onClear}
          aria-label={t('search.input.clear')}
          title={t('search.input.clear')}
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
});
