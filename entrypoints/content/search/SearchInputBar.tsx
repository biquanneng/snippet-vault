// SPDX-License-Identifier: MPL-2.0

import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  MAX_SEARCH_QUERY_LENGTH,
  type SearchPanelKind,
} from '../../../lib/browser/message-contract';

interface SearchInputBarProps {
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
  { kind, query, onClear, onQueryChange, onSearch },
  ref,
) {
  const placeholder =
    kind === 'vault'
      ? '搜索内容、标签、说明或来源…'
      : '搜索临时工作区…';

  return (
    <div className="relative flex h-14 items-center">
      <Search
        className="pointer-events-none absolute left-1 size-5 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        className="h-14 rounded-none border-0 bg-transparent pr-10 pl-9 text-base shadow-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 md:text-base"
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
        maxLength={MAX_SEARCH_QUERY_LENGTH}
        autoComplete="off"
        spellCheck={false}
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute right-0 text-muted-foreground hover:text-foreground"
          onClick={onClear}
          aria-label="清空搜索"
          title="清空搜索"
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
});
