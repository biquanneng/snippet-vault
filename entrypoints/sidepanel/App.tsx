// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef } from 'react';

import { SearchPanelContent } from '../content/search/SearchPanelContent';

export function App() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <main className="flex h-dvh min-w-0 flex-col bg-background text-foreground">
      <h1 className="sr-only">SnippetVault</h1>
      <SearchPanelContent inputRef={inputRef} />
    </main>
  );
}
