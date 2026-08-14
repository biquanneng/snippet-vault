// SPDX-License-Identifier: MPL-2.0

import {
  type ReactNode,
  type Ref,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';

import { ContextMarker } from '../../../components/context-marker';
import { Button } from '../../../components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ContextPresetManagementListData,
  type ContextPresetSummary,
  type DeleteItemData,
  type ExtensionErrorCode,
  type ExtensionResponse,
  type ExtendWorkspaceItemData,
  type LabelSummary,
  type PromoteWorkspaceItemData,
  type SearchPanelData,
  type SearchPanelItem,
  type SearchPanelKind,
  type SearchPanelRequest,
} from '../../../lib/browser/message-contract';
import { toIntlLocale, type Translator } from '../../../lib/i18n-catalog';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { getWorkspaceExpiryDays } from '../../../lib/workspace-expiry';
import { SearchInputBar } from './SearchInputBar';
import { getVisibleFilterOptions } from './filter-option-visibility';
import { getMutationStatusMessages } from './mutation-status';
import {
  getNextSearchResultSelectionId,
  getSearchResultOptionId,
} from './search-result-selection';
import { SearchPanelResults } from './SearchPanelResults';
import { copySearchPanelItemContent } from './SearchResultItem';
import { SnippetForm } from './SnippetForm';

const PAGE_SIZE = 12;
const COLLAPSED_CONTEXT_LIMIT = 4;

type SnippetFormState =
  | { mode: 'create' }
  | { mode: 'edit'; item: SearchPanelItem };

interface SearchPanelCapabilities {
  enhancedCreate?: boolean;
  workspaceLifecycleActions?: boolean;
}

interface SearchPanelContentProps {
  inputRef: Ref<HTMLInputElement>;
  capabilities?: SearchPanelCapabilities;
  compactToolbar?: boolean;
  portalContainer?: HTMLElement;
  toolbarEnd?: ReactNode;
  requestSender?: SearchPanelRequestSender;
}

interface WorkspaceActionState {
  action: 'extend' | 'promote';
  itemId: string;
}

export type SearchPanelRequestSender = (
  request: SearchPanelRequest,
) => Promise<ExtensionResponse<SearchPanelData>>;

export function SearchPanelContent({
  inputRef,
  capabilities,
  compactToolbar = false,
  portalContainer,
  toolbarEnd,
  requestSender = sendSearchPanelRequest,
}: SearchPanelContentProps) {
  const { locale, t } = useI18n();
  const resultsId = useId();
  const enhancedCreateEnabled = capabilities?.enhancedCreate ?? false;
  const workspaceLifecycleActionsEnabled =
    capabilities?.workspaceLifecycleActions ?? false;
  const [kind, setKind] = useState<SearchPanelKind>('vault');
  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<SearchPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<SnippetFormState | null>(null);
  const [contexts, setContexts] = useState<ContextPresetSummary[]>([]);
  const [contextsLoading, setContextsLoading] = useState(false);
  const [contextsError, setContextsError] = useState<string | null>(null);
  const [contextsRevision, setContextsRevision] = useState(0);
  const [selectedContextId, setSelectedContextId] = useState<string>();
  const [contextsExpanded, setContextsExpanded] = useState(false);
  const [selectedLabelFilter, setSelectedLabelFilter] =
    useState<LabelSummary>();
  const [workspaceExpiryDays, setWorkspaceExpiryDays] = useState(7);
  const [workspaceActionState, setWorkspaceActionState] =
    useState<WorkspaceActionState | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const [keyboardSelectionActive, setKeyboardSelectionActive] =
    useState(false);
  const formOpen = formState !== null;
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(toIntlLocale(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const visibleItemIds = useMemo(
    () => data?.items.map((item) => item.id) ?? [],
    [data?.items],
  );
  const selectedResult = useMemo(
    () => data?.items.find((item) => item.id === selectedResultId),
    [data?.items, selectedResultId],
  );
  const queryDirty = draftQuery.trim() !== submittedQuery.trim();
  const resultActionsEnabled =
    !formOpen && !loading && !queryDirty && visibleItemIds.length > 0;
  const activeDescendantId =
    keyboardSelectionActive && selectedResult
      ? getSearchResultOptionId(resultsId, selectedResult.id)
      : undefined;
  const collapsedContexts = getVisibleFilterOptions(
    contexts,
    selectedContextId,
    COLLAPSED_CONTEXT_LIMIT,
  );
  const displayedContexts = contextsExpanded ? contexts : collapsedContexts;
  const hiddenContextCount = Math.max(
    0,
    contexts.length - collapsedContexts.length,
  );

  useEffect(() => {
    let cancelled = false;
    setContextsLoading(true);
    setContextsError(null);

    void sendExtensionMessage<ContextPresetManagementListData>({
      type: MESSAGE_TYPE.getContextPresetManagement,
    }).then((response) => {
      if (cancelled) {
        return;
      }
      setContextsLoading(false);
      if (!response.ok) {
        setContexts([]);
        setContextsError(response.error.message);
        return;
      }

      setContexts(response.data.contextPresets);
      setSelectedContextId((current) =>
        current &&
        response.data.contextPresets.some((context) => context.id === current)
          ? current
          : undefined,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [contextsRevision, locale]);

  useEffect(() => {
    if (!workspaceLifecycleActionsEnabled) {
      setWorkspaceActionState(null);
      return;
    }

    let cancelled = false;
    void getWorkspaceExpiryDays().then((days) => {
      if (!cancelled) {
        setWorkspaceExpiryDays(days);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceLifecycleActionsEnabled]);

  useEffect(() => {
    if (
      selectedResultId &&
      !visibleItemIds.includes(selectedResultId)
    ) {
      setSelectedResultId(undefined);
      setKeyboardSelectionActive(false);
    }
  }, [selectedResultId, visibleItemIds]);

  useEffect(() => {
    if (queryDirty) {
      setSelectedResultId(undefined);
      setKeyboardSelectionActive(false);
    }
  }, [queryDirty]);

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
        ...(selectedContextId ? { contextId: selectedContextId } : {}),
        ...(selectedLabelFilter ? { labelId: selectedLabelFilter.id } : {}),
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
  }, [
    kind,
    locale,
    page,
    refreshKey,
    requestSender,
    selectedContextId,
    selectedLabelFilter,
    submittedQuery,
  ]);

  function submitQuery(nextQuery: string) {
    if (formOpen) {
      return;
    }
    setDraftQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setKeyboardSelectionActive(false);
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function clearQuery() {
    if (formOpen) {
      return;
    }
    setDraftQuery('');
    setSubmittedQuery('');
    setKeyboardSelectionActive(false);
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function changeKind(value: string) {
    if (formOpen || (value !== 'vault' && value !== 'workspace')) {
      return;
    }
    setKind(value);
    setKeyboardSelectionActive(false);
    setPage(0);
    setData(null);
  }

  function toggleContextFilter(contextId?: string) {
    if (formOpen) {
      return;
    }
    setSelectedContextId((current) =>
      current === contextId ? undefined : contextId,
    );
    setKeyboardSelectionActive(false);
    setPage(0);
    setData(null);
  }

  function toggleLabelFilter(label: LabelSummary) {
    if (formOpen) {
      return;
    }
    setSelectedLabelFilter((current) =>
      current?.id === label.id ? undefined : label,
    );
    setKeyboardSelectionActive(false);
    setPage(0);
    setData(null);
  }

  async function handleDelete(item: SearchPanelItem) {
    const response = await sendExtensionMessage<DeleteItemData>({
      type: MESSAGE_TYPE.deleteItem,
      payload: { kind: item.kind, id: item.id },
    });

    if (!response.ok) {
      console.error('[SnippetVault] Delete failed', response.error);
      toast.error(t('search.results.deleteFailed'), {
        description: response.error.message,
      });
      return;
    }

    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((candidate) => candidate.id !== item.id),
          }
        : current,
    );
    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.results.deleted'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    setRefreshKey((current) => current + 1);
  }

  async function handleExtendWorkspaceItem(item: SearchPanelItem) {
    if (
      item.kind !== 'workspace' ||
      !workspaceLifecycleActionsEnabled ||
      workspaceActionState
    ) {
      return;
    }

    setWorkspaceActionState({ action: 'extend', itemId: item.id });
    const response = await sendExtensionMessage<ExtendWorkspaceItemData>({
      type: MESSAGE_TYPE.extendWorkspaceItem,
      payload: { id: item.id, expectedUpdatedAt: item.updatedAt },
    });
    setWorkspaceActionState(null);

    if (!response.ok) {
      toast.error(
        getWorkspaceActionErrorTitle('extend', response.error.code, t),
        {
          description: getWorkspaceActionErrorDescription(
            response.error.code,
            response.error.message,
            t,
          ),
        },
      );
      return;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.results.extended'), {
      description: [
        t('search.results.extendedDescription', [
          dateTimeFormatter.format(new Date(response.data.expiresAt)),
          response.data.addedDays,
        ]),
        ...statusMessages,
      ].join(' · '),
    });
    setData(null);
    setRefreshKey((current) => current + 1);
  }

  async function handlePromoteWorkspaceItem(item: SearchPanelItem) {
    if (
      item.kind !== 'workspace' ||
      !workspaceLifecycleActionsEnabled ||
      workspaceActionState
    ) {
      return;
    }

    setWorkspaceActionState({ action: 'promote', itemId: item.id });
    const response = await sendExtensionMessage<PromoteWorkspaceItemData>({
      type: MESSAGE_TYPE.promoteWorkspaceItem,
      payload: { id: item.id, expectedUpdatedAt: item.updatedAt },
    });
    setWorkspaceActionState(null);

    if (!response.ok) {
      toast.error(
        getWorkspaceActionErrorTitle('promote', response.error.code, t),
        {
          description: getWorkspaceActionErrorDescription(
            response.error.code,
            response.error.message,
            t,
          ),
        },
      );
      return;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.results.promoted'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    setData(null);
    setRefreshKey((current) => current + 1);
  }

  function openCreateForm() {
    setKeyboardSelectionActive(false);
    setFormState({ mode: 'create' });
  }

  function openEditForm(item: SearchPanelItem) {
    setSelectedResultId(item.id);
    setKeyboardSelectionActive(false);
    setFormState({ mode: 'edit', item });
  }

  function moveSelectedResult(direction: -1 | 1) {
    if (visibleItemIds.length === 0) {
      return;
    }
    setKeyboardSelectionActive(true);
    setSelectedResultId((current) =>
      getNextSearchResultSelectionId(visibleItemIds, current, direction),
    );
  }

  function selectResultFromItem(itemId: string | undefined) {
    setSelectedResultId(itemId);
    setKeyboardSelectionActive(false);
  }

  function handleSelectedResultCopy() {
    if (!selectedResult) {
      return;
    }
    void copySearchPanelItemContent(selectedResult, t).then((didCopy) => {
      if (didCopy) {
        toast.success(t('search.results.copied'));
      }
    });
  }

  function openSelectedResult() {
    if (!selectedResult) {
      return;
    }
    openEditForm(selectedResult);
  }

  function refreshResults() {
    if (formOpen || loading) {
      return;
    }
    setData(null);
    setRefreshKey((current) => current + 1);
  }

  function handleSnippetSaved(
    mode: SnippetFormState['mode'],
    continueCreating = false,
  ) {
    if (!continueCreating) {
      setFormState(null);
    }
    if (mode === 'create') {
      setDraftQuery('');
      setSubmittedQuery('');
      setPage(0);
    }
    setData(null);
    setRefreshKey((current) => current + 1);
  }

  const results = (
    <SearchPanelResults
      data={data}
      error={error}
      kind={kind}
      loading={loading}
      portalContainer={portalContainer}
      query={submittedQuery.trim()}
      resultsId={resultsId}
      selectedItemId={selectedResultId}
      selectedLabelId={selectedLabelFilter?.id}
      workspaceActionState={workspaceActionState}
      workspaceExpiryDays={workspaceExpiryDays}
      workspaceLifecycleActionsEnabled={workspaceLifecycleActionsEnabled}
      onDelete={handleDelete}
      onEdit={openEditForm}
      onExtendWorkspaceItem={handleExtendWorkspaceItem}
      onLabelFilterToggle={toggleLabelFilter}
      onPageChange={setPage}
      onPromoteWorkspaceItem={handlePromoteWorkspaceItem}
      onRetry={() => setRefreshKey((current) => current + 1)}
      onSelectedItemChange={selectResultFromItem}
    />
  );
  const editedItem =
    formState?.mode === 'edit' ? formState.item : undefined;
  const panelBody = formState ? (
    <SnippetForm
      key={
        editedItem
          ? `${editedItem.kind}:${editedItem.id}:${editedItem.updatedAt}`
          : `create:${kind}`
      }
      enhancedCreate={enhancedCreateEnabled}
      kind={editedItem?.kind ?? kind}
      item={editedItem}
      portalContainer={portalContainer}
      onCancel={() => setFormState(null)}
      onSaved={(continueCreating) =>
        handleSnippetSaved(formState.mode, continueCreating)
      }
    />
  ) : (
    results
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain">
      <header className="shrink-0 px-4 pt-1">
        <SearchInputBar
          ref={inputRef}
          kind={kind}
          query={draftQuery}
          disabled={formOpen}
          activeDescendantId={activeDescendantId}
          hasActiveResult={
            keyboardSelectionActive && Boolean(selectedResult)
          }
          resultActionsEnabled={resultActionsEnabled}
          portalContainer={portalContainer}
          resultsAvailable={resultActionsEnabled}
          resultsId={resultsId}
          onClear={clearQuery}
          onNavigateResults={moveSelectedResult}
          onOpenSelectedResult={openSelectedResult}
          onQueryChange={setDraftQuery}
          onSearch={submitQuery}
          onSelectResultPrimaryAction={handleSelectedResultCopy}
        />
      </header>

      <Tabs
        value={kind}
        onValueChange={changeKind}
        className="min-h-0 flex-1 gap-0 overflow-hidden"
      >
        <div
          className={
            compactToolbar
              ? 'flex shrink-0 items-center justify-between gap-2 bg-muted/30 px-3 py-2'
              : 'flex shrink-0 flex-col gap-2 bg-muted/30 px-4 py-2 sm:flex-row sm:items-center sm:justify-between'
          }
        >
          <TabsList className={compactToolbar ? undefined : 'w-full sm:w-auto'}>
            <TabsTrigger
              value="vault"
              className={compactToolbar ? 'px-1.5' : 'px-2'}
              disabled={formOpen}
            >
              <ShieldCheck aria-hidden="true" />
              {t('search.tabs.vault')}
            </TabsTrigger>
            <TabsTrigger
              value="workspace"
              className={compactToolbar ? 'px-1.5' : 'px-2'}
              disabled={formOpen}
            >
              <BriefcaseBusiness aria-hidden="true" />
              {t('search.tabs.workspace')}
            </TabsTrigger>
          </TabsList>
          <div
            className={
              compactToolbar
                ? 'flex shrink-0 items-center gap-2'
                : 'flex min-w-0 items-center gap-2'
            }
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={formOpen}
              aria-pressed={formState?.mode === 'create'}
              onClick={openCreateForm}
              className={
                compactToolbar
                  ? 'shrink-0'
                  : 'min-w-0 flex-1 sm:flex-none'
              }
            >
              <Plus aria-hidden="true" />
              <span className="truncate">{t('search.create.open')}</span>
            </Button>
            <div className="flex shrink-0 items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={formOpen || loading}
                      onClick={refreshResults}
                      aria-label={t('search.refresh')}
                    >
                      <RefreshCw
                        aria-hidden="true"
                        className={loading ? 'animate-spin' : ''}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    portalContainer={portalContainer}
                    side="top"
                    sideOffset={4}
                  >
                    {t('search.refresh')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {toolbarEnd && !formOpen ? (
                <div className="flex items-center gap-1">
                  {toolbarEnd}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!formOpen ? (
          <div className="shrink-0 space-y-2 px-4 py-2.5">
            <div
              className="flex min-w-0 flex-wrap items-center gap-1.5"
              role="group"
              aria-label={t('search.filters.contextGroup')}
            >
              <span className="mr-0.5 text-xs text-muted-foreground">
                {t('search.filters.context')}
              </span>
              <Button
                type="button"
                variant={selectedContextId ? 'ghost' : 'secondary'}
                size="xs"
                aria-pressed={!selectedContextId}
                onClick={() => toggleContextFilter()}
              >
                {t('search.filters.contextAll')}
              </Button>
              {displayedContexts.map((context) => (
                <Button
                  key={context.id}
                  type="button"
                  variant={
                    selectedContextId === context.id ? 'secondary' : 'ghost'
                  }
                  size="xs"
                  aria-pressed={selectedContextId === context.id}
                  onClick={() => toggleContextFilter(context.id)}
                >
                  <ContextMarker color={context.color} />
                  <span className="max-w-40 truncate">{context.name}</span>
                </Button>
              ))}
              {hiddenContextCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-expanded={contextsExpanded}
                  onClick={() =>
                    setContextsExpanded((current) => !current)
                  }
                  className="text-muted-foreground"
                >
                  {contextsExpanded ? (
                    <ChevronUp aria-hidden="true" />
                  ) : (
                    <ChevronDown aria-hidden="true" />
                  )}
                  {t(
                    contextsExpanded
                      ? 'search.filters.collapseContexts'
                      : 'search.filters.expandContexts',
                    contextsExpanded ? undefined : [hiddenContextCount],
                  )}
                </Button>
              ) : null}
              {contextsLoading ? (
                <RefreshCw
                  className="size-3.5 animate-spin text-muted-foreground"
                  aria-label={t('search.results.loading')}
                />
              ) : null}
            </div>
            {contextsError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-destructive">
                  {t('search.filters.contextLoadFailed')}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() =>
                    setContextsRevision((current) => current + 1)
                  }
                >
                  <RotateCcw aria-hidden="true" />
                  {t('search.filters.retry')}
                </Button>
              </div>
            ) : null}
            {selectedLabelFilter ? (
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Tag className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{t('search.filters.label')}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => toggleLabelFilter(selectedLabelFilter)}
                  aria-label={t('search.filters.clearLabel')}
                  title={t('search.filters.clearLabel')}
                >
                  {getLocalizedLabelName(
                    selectedLabelFilter.id,
                    selectedLabelFilter.name,
                    locale,
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <TabsContent
          value="vault"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {kind === 'vault' ? panelBody : null}
        </TabsContent>
        <TabsContent
          value="workspace"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {kind === 'workspace' ? panelBody : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getWorkspaceActionErrorTitle(
  action: WorkspaceActionState['action'],
  code: ExtensionErrorCode,
  t: Translator,
): string {
  if (code === 'CONFLICT') {
    return t('search.results.workspaceConflict');
  }
  if (code === 'NOT_FOUND') {
    return t('search.results.workspaceNotFound');
  }
  return t(
    action === 'extend'
      ? 'search.results.extendFailed'
      : 'search.results.promoteFailed',
  );
}

function getWorkspaceActionErrorDescription(
  code: ExtensionErrorCode,
  fallback: string,
  t: Translator,
): string {
  if (code === 'CONFLICT') {
    return t('search.results.workspaceConflictDescription');
  }
  if (code === 'NOT_FOUND') {
    return t('search.results.workspaceNotFoundDescription');
  }
  return fallback;
}

const sendSearchPanelRequest: SearchPanelRequestSender = (request) =>
  sendExtensionMessage<SearchPanelData>(request);
