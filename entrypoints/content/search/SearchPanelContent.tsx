// SPDX-License-Identifier: MPL-2.0

import {
  type ReactNode,
  type Ref,
  useEffect,
  useState,
} from 'react';
import { BriefcaseBusiness, ShieldCheck } from 'lucide-react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs';
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ExtensionResponse,
  type SearchPanelData,
  type SearchPanelKind,
  type SearchPanelRequest,
} from '../../../lib/browser/message-contract';
import { SearchInputBar } from './SearchInputBar';
import { SearchPanelResults } from './SearchPanelResults';

const PAGE_SIZE = 12;

interface SearchPanelContentProps {
  inputRef: Ref<HTMLInputElement>;
  toolbarEnd?: ReactNode;
  requestSender?: SearchPanelRequestSender;
}

export type SearchPanelRequestSender = (
  request: SearchPanelRequest,
) => Promise<ExtensionResponse<SearchPanelData>>;

export function SearchPanelContent({
  inputRef,
  toolbarEnd,
  requestSender = sendSearchPanelRequest,
}: SearchPanelContentProps) {
  const [kind, setKind] = useState<SearchPanelKind>('vault');
  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<SearchPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void requestSender({
      type: MESSAGE_TYPE.searchPanel,
      payload: {
        kind,
        query: submittedQuery,
        page,
        pageSize: PAGE_SIZE,
      },
    }).then((response) => {
      if (cancelled) {
        return;
      }
      if (!response.ok) {
        console.error('[SnippetVault] Search request failed', {
          code: response.error.code,
          message: response.error.message,
          kind,
          operation: submittedQuery.trim() ? 'search' : 'browse',
          page,
          pageSize: PAGE_SIZE,
        });
        setData(null);
        setError(response.error.message);
        setLoading(false);
        return;
      }

      setData(response.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [kind, page, refreshKey, requestSender, submittedQuery]);

  function submitQuery(nextQuery: string) {
    setDraftQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function clearQuery() {
    setDraftQuery('');
    setSubmittedQuery('');
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function changeKind(value: string) {
    if (value !== 'vault' && value !== 'workspace') {
      return;
    }
    setKind(value);
    setPage(0);
    setData(null);
  }

  const results = (
    <SearchPanelResults
      data={data}
      error={error}
      kind={kind}
      loading={loading}
      query={submittedQuery.trim()}
      onPageChange={setPage}
      onRetry={() => setRefreshKey((current) => current + 1)}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain">
      <header className="shrink-0 border-b px-4">
        <SearchInputBar
          ref={inputRef}
          kind={kind}
          query={draftQuery}
          onClear={clearQuery}
          onQueryChange={setDraftQuery}
          onSearch={submitQuery}
        />
      </header>

      <Tabs
        value={kind}
        onValueChange={changeKind}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2">
          <TabsList>
            <TabsTrigger value="vault" className="min-w-24 px-3">
              <ShieldCheck aria-hidden="true" />
              机密
            </TabsTrigger>
            <TabsTrigger value="workspace" className="min-w-32 px-3">
              <BriefcaseBusiness aria-hidden="true" />
              临时工作区
            </TabsTrigger>
          </TabsList>
          {toolbarEnd}
        </div>
        <TabsContent
          value="vault"
          className="flex min-h-0 flex-1 flex-col"
        >
          {kind === 'vault' ? results : null}
        </TabsContent>
        <TabsContent
          value="workspace"
          className="flex min-h-0 flex-1 flex-col"
        >
          {kind === 'workspace' ? results : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const sendSearchPanelRequest: SearchPanelRequestSender = (request) =>
  sendExtensionMessage<SearchPanelData>(request);
