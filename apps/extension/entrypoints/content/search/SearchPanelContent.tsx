// SPDX-License-Identifier: MPL-2.0

import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';
import { Braces, Plus, Settings, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { ExtensionTool } from '../../../components/tools/ToolList';
import { Button } from '../../../components/ui/button';
import { Kbd, KbdGroup } from '../../../components/ui/kbd';
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type DeleteItemData,
  type ExtensionErrorCode,
  type ExtensionResponse,
  type ExtendWorkspaceItemData,
  type LabelSummary,
  type PromoteWorkspaceItemData,
  type SavePageLinkData,
  type SearchPanelData,
  type SearchPanelItem,
  type SearchPanelKind,
  type SearchPanelPagination,
  type SearchPanelRequest,
} from '../../../lib/browser/message-contract';
import {
  readDocumentSource,
  type PageSource,
} from '../../../lib/browser/page-source';
import { toIntlLocale, type Translator } from '../../../lib/i18n-catalog';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { getPageLinkUrl } from '../../../lib/page-link';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { getWorkspaceExpiryDays } from '../../../lib/workspace-expiry';
import {
  ActionMenu,
  type PanelAction,
  type PanelActionSection,
} from './ActionMenu';
import { COPY_AS_FORMATS, copyItem } from './copy-actions';
import { getMutationStatusMessages } from './mutation-status';
import { groupVaultItemsByDomain } from './result-groups';
import {
  PANEL_SCOPES,
  SearchInputBar,
  type PanelScope,
} from './SearchInputBar';
import { SearchPanelResults, type ResultSection } from './SearchPanelResults';
import {
  getNextSearchResultSelectionId,
  getSearchResultOptionId,
} from './search-result-selection';
import { SnippetForm } from './SnippetForm';

const PAGE_SIZE = 30;
/** Long enough to skip mid-word requests, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 120;
const IS_MAC = /mac/i.test(globalThis.navigator?.platform ?? '');
const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

type SnippetFormState =
  | { mode: 'create' }
  | { mode: 'edit'; item: SearchPanelItem };

interface SearchPanelCapabilities {
  enhancedCreate?: boolean;
  workspaceLifecycleActions?: boolean;
}

interface SearchPanelContentProps {
  inputRef: RefObject<HTMLInputElement | null>;
  capabilities?: SearchPanelCapabilities;
  portalContainer?: HTMLElement;
  requestSender?: SearchPanelRequestSender;
  /** Source suggested for new snippets; defaults to the current document. */
  getPageSource?: () => Promise<PageSource | null>;
  onOpenTool?: (tool: ExtensionTool) => void;
  onOpenSettings?: () => void;
  /** Called after the primary copy so the user can paste right away. */
  onClose?: () => void;
}

export type SearchPanelRequestSender = (
  request: SearchPanelRequest,
) => Promise<ExtensionResponse<SearchPanelData>>;

/**
 * A keyboard-first command palette: type to search, arrows to select, Enter
 * to copy, ⌘K for every other action. There is no pagination or refresh
 * control; more results load as the list scrolls.
 */
export function SearchPanelContent({
  inputRef,
  capabilities,
  portalContainer,
  requestSender = sendSearchPanelRequest,
  getPageSource = readCurrentDocumentSource,
  onOpenTool,
  onOpenSettings,
  onClose,
}: SearchPanelContentProps) {
  const { locale, t } = useI18n();
  const resultsId = useId();
  const enhancedCreateEnabled = capabilities?.enhancedCreate ?? false;
  const workspaceLifecycleActionsEnabled =
    capabilities?.workspaceLifecycleActions ?? false;
  const [scope, setScope] = useState<PanelScope>('vault');
  // The record kind stays put while the Tools scope is shown.
  const [kind, setKind] = useState<SearchPanelKind>('vault');
  const [draftQuery, setDraftQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [items, setItems] = useState<SearchPanelItem[]>([]);
  const [pagination, setPagination] = useState<SearchPanelPagination | null>(
    null,
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<SnippetFormState | null>(null);
  const [selectedLabelFilter, setSelectedLabelFilter] =
    useState<LabelSummary>();
  const [workspaceExpiryDays, setWorkspaceExpiryDays] = useState(7);
  const [mutationPending, setMutationPending] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string>();
  const toolsScope = scope === 'tools';
  const query = submittedQuery.trim();
  const canStashPage =
    location.protocol === 'http:' || location.protocol === 'https:';

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(toIntlLocale(locale), {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(toIntlLocale(locale), {
        numeric: 'auto',
        style: 'short',
      }),
    [locale],
  );

  const sections = useMemo<ResultSection[]>(
    () =>
      kind === 'vault' && query
        ? groupVaultItemsByDomain(items, t('search.results.unknownSource')).map(
            (group) => ({ title: group.domain, items: group.items }),
          )
        : [{ items }],
    [items, kind, query, t],
  );
  const orderedItems = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
  const selectedItem =
    orderedItems.find((item) => item.id === selectedId) ?? orderedItems[0];
  // Acting on results that no longer match the field could copy the wrong
  // secret, so keyboard actions wait for fresh results.
  const resultsStale =
    draftQuery !== submittedQuery || composing || (loading && page === 0);
  const hasMore =
    pagination !== null && pagination.page + 1 < pagination.totalPages;
  const selectedPageLinkUrl = selectedItem
    ? getPageLinkUrl(selectedItem)
    : undefined;

  useEffect(() => {
    if (!workspaceLifecycleActionsEnabled) {
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
    if (composing || draftQuery === submittedQuery) {
      return;
    }
    const timer = window.setTimeout(() => {
      setSubmittedQuery(draftQuery);
      setPage(0);
      setSelectedId(undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [composing, draftQuery, submittedQuery]);

  useEffect(() => {
    let cancelled = false;
    const requestPage = page;
    setLoading(true);
    setError(null);

    void requestSender({
      type: MESSAGE_TYPE.searchPanel,
      payload: {
        kind,
        query: submittedQuery,
        page: requestPage,
        pageSize: PAGE_SIZE,
        ...(selectedLabelFilter ? { labelId: selectedLabelFilter.id } : {}),
      },
    }).then((response) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!response.ok) {
        console.error('[SnippetVault] Search request failed', {
          code: response.error.code,
          kind,
          operation: submittedQuery.trim() ? 'search' : 'browse',
          page: requestPage,
          pageSize: PAGE_SIZE,
        });
        if (requestPage === 0) {
          setItems([]);
          setPagination(null);
          setError(response.error.message);
        } else {
          toast.error(t('search.results.failed'), {
            description: response.error.message,
          });
        }
        return;
      }
      setHasLoaded(true);
      setPagination(response.data.pagination);
      setItems((current) =>
        requestPage === 0
          ? response.data.items
          : appendUnique(current, response.data.items),
      );
    });

    return () => {
      cancelled = true;
    };
    // `t` only feeds a failure toast; `locale` already refetches on a
    // language change.
  }, [
    kind,
    locale,
    page,
    refreshKey,
    requestSender,
    selectedLabelFilter,
    submittedQuery,
  ]);

  useEffect(() => {
    setConfirmDeleteId(undefined);
  }, [selectedItem?.id]);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus());
  }

  function reload() {
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function changeScope(next: PanelScope) {
    if (formState || next === scope) {
      return;
    }
    setScope(next);
    setActionsOpen(false);
    if (next === 'tools' || next === kind) {
      return;
    }
    // A different record kind must never flash the other kind's records.
    setKind(next);
    setItems([]);
    setPagination(null);
    setHasLoaded(false);
    setSelectedId(undefined);
    setPage(0);
  }

  function cycleScope(direction: 1 | -1) {
    const index = PANEL_SCOPES.indexOf(scope);
    changeScope(
      PANEL_SCOPES[
        (index + direction + PANEL_SCOPES.length) % PANEL_SCOPES.length
      ],
    );
  }

  function toggleLabelFilter(label: LabelSummary) {
    setSelectedLabelFilter((current) =>
      current?.id === label.id ? undefined : label,
    );
    setSelectedId(undefined);
    setPage(0);
  }

  function loadMore() {
    if (!loading && hasMore && pagination) {
      setPage(pagination.page + 1);
    }
  }

  async function copySelected(item: SearchPanelItem, closeAfter: boolean) {
    const outcome = await copyItem(item);
    if (!outcome.ok) {
      toast.error(t(outcome.errorKey));
      return false;
    }
    if (closeAfter) {
      toast.success(t('search.results.copied'));
      onClose?.();
    }
    return true;
  }

  async function copySelectedAs(
    item: SearchPanelItem,
    format: (typeof COPY_AS_FORMATS)[number]['format'],
  ) {
    const outcome = await copyItem(item, format);
    if (outcome.ok) {
      toast.success(t('search.results.copied'));
    } else {
      toast.error(t(outcome.errorKey));
    }
  }

  function openLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function activate(item: SearchPanelItem) {
    void copySelected(item, true);
  }

  function activateSecondary(item: SearchPanelItem) {
    const url = getPageLinkUrl(item);
    if (url) {
      openLink(url);
    } else {
      setFormState({ mode: 'edit', item });
    }
  }

  function moveSelection(direction: -1 | 1) {
    setSelectedId(
      getNextSearchResultSelectionId(
        orderedItems.map((item) => item.id),
        selectedItem?.id,
        direction,
      ),
    );
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing || composing) {
      return;
    }
    const mod = IS_MAC ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();

    if (event.key === 'Tab' && !mod && !event.altKey) {
      event.preventDefault();
      cycleScope(event.shiftKey ? -1 : 1);
      return;
    }
    if (mod && key === 'k') {
      event.preventDefault();
      if (!event.repeat) {
        setActionsOpen((open) => !open);
      }
      return;
    }
    if (toolsScope) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onOpenTool?.('json');
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (resultsStale) {
        // Search right away instead of acting on outdated results.
        setSubmittedQuery(draftQuery);
        setPage(0);
        return;
      }
      if (!selectedItem || event.altKey || event.shiftKey) {
        return;
      }
      if (mod) {
        activateSecondary(selectedItem);
      } else {
        activate(selectedItem);
      }
      return;
    }
    if (mod && key === 'e' && selectedItem && !resultsStale) {
      event.preventDefault();
      setFormState({ mode: 'edit', item: selectedItem });
    }
  }

  async function handleDelete(item: SearchPanelItem) {
    setMutationPending(true);
    const response = await sendExtensionMessage<DeleteItemData>({
      type: MESSAGE_TYPE.deleteItem,
      payload: { kind: item.kind, id: item.id },
    });
    setMutationPending(false);
    setConfirmDeleteId(undefined);

    if (!response.ok) {
      console.error('[SnippetVault] Delete failed', response.error);
      toast.error(t('search.results.deleteFailed'), {
        description: response.error.message,
      });
      return;
    }

    // Keep the selection on a neighbour of the removed row.
    const index = orderedItems.findIndex(
      (candidate) => candidate.id === item.id,
    );
    setSelectedId(orderedItems[index + 1]?.id ?? orderedItems[index - 1]?.id);
    setItems((current) =>
      current.filter((candidate) => candidate.id !== item.id),
    );
    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.results.deleted'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    reload();
  }

  async function handleExtendWorkspaceItem(item: SearchPanelItem) {
    if (item.kind !== 'workspace' || mutationPending) {
      return;
    }
    setMutationPending(true);
    const response = await sendExtensionMessage<ExtendWorkspaceItemData>({
      type: MESSAGE_TYPE.extendWorkspaceItem,
      payload: { id: item.id, expectedUpdatedAt: item.updatedAt },
    });
    setMutationPending(false);

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
    reload();
  }

  async function handlePromoteWorkspaceItem(item: SearchPanelItem) {
    if (item.kind !== 'workspace' || mutationPending) {
      return;
    }
    setMutationPending(true);
    const response = await sendExtensionMessage<PromoteWorkspaceItemData>({
      type: MESSAGE_TYPE.promoteWorkspaceItem,
      payload: { id: item.id, expectedUpdatedAt: item.updatedAt },
    });
    setMutationPending(false);

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
    reload();
  }

  async function stashCurrentPage() {
    if (mutationPending) {
      return;
    }
    setMutationPending(true);
    try {
      // From the panel a stash always goes to Temporary, whatever the quick
      // save target is, so it shows up where the user is looking.
      const response = await sendExtensionMessage<SavePageLinkData>({
        type: MESSAGE_TYPE.savePageLink,
        payload: { temporary: true },
      });
      if (!response.ok) {
        toast.error(t('quickSave.saveFailed'), {
          description: response.error.message,
        });
        return;
      }
      toast.success(
        t(
          response.data.outcome === 'extended'
            ? 'quickSave.pageExtended'
            : 'quickSave.savedPage',
        ),
      );
      changeScope('workspace');
      setSelectedId(response.data.id);
      reload();
    } finally {
      setMutationPending(false);
    }
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
      setSelectedId(undefined);
    }
    reload();
  }

  const actionSections = buildActionSections();

  function startCreate() {
    if (toolsScope) {
      setScope(kind);
    }
    setFormState({ mode: 'create' });
  }

  function buildActionSections(): PanelActionSection[] {
    const result: PanelActionSection[] = [];
    const item = !toolsScope && !resultsStale ? selectedItem : undefined;

    if (item) {
      const pageLinkUrl = getPageLinkUrl(item);
      const itemActions: PanelAction[] = [
        {
          id: 'copy',
          label: t('search.actions.copy'),
          keys: ['↵'],
          onSelect: () => void copySelected(item, true),
        },
      ];
      if (pageLinkUrl) {
        itemActions.push({
          id: 'open',
          label: t('search.results.openLink'),
          keys: [MOD_KEY, '↵'],
          onSelect: () => openLink(pageLinkUrl),
        });
      }
      itemActions.push({
        id: 'edit',
        label: t('search.results.edit'),
        keys: pageLinkUrl ? [MOD_KEY, 'E'] : [MOD_KEY, '↵'],
        onSelect: () => setFormState({ mode: 'edit', item }),
      });
      result.push({
        id: 'item',
        title: t('search.actions.groupItem'),
        actions: itemActions,
      });
      if (item.kind === 'workspace' && workspaceLifecycleActionsEnabled) {
        result.push({
          id: 'temporary',
          title: t('search.actions.groupTemporary'),
          actions: [
            {
              id: 'extend',
              label: t(
                'search.results.extendByDays',
                [workspaceExpiryDays],
                workspaceExpiryDays,
              ),
              disabled: mutationPending,
              onSelect: () => void handleExtendWorkspaceItem(item),
            },
            {
              id: 'promote',
              label: t('search.results.promote'),
              disabled: mutationPending,
              onSelect: () => void handlePromoteWorkspaceItem(item),
            },
          ],
        });
      }
      if (!pageLinkUrl) {
        result.push({
          id: 'copy-as',
          title: t('search.actions.copyAs'),
          actions: COPY_AS_FORMATS.map(({ format, labelKey }) => ({
            id: `copy-as-${format}`,
            label: t(labelKey),
            onSelect: () => void copySelectedAs(item, format),
          })),
        });
      }
    }

    const panelActions: PanelAction[] = [
      {
        id: 'new',
        label: t(
          kind === 'workspace'
            ? 'search.actions.newTemporary'
            : 'search.actions.newSecret',
        ),
        onSelect: startCreate,
      },
    ];
    if (canStashPage) {
      panelActions.push({
        id: 'stash',
        label: t('search.stashPage'),
        disabled: mutationPending,
        onSelect: () => void stashCurrentPage(),
      });
    }
    panelActions.push({
      id: 'json-tool',
      label: t('search.actions.openJsonTool'),
      onSelect: () => onOpenTool?.('json'),
    });
    if (onOpenSettings) {
      panelActions.push({
        id: 'settings',
        label: t('settings.open'),
        onSelect: onOpenSettings,
      });
    }
    result.push({
      id: 'panel',
      title: t('search.actions.groupGeneral'),
      actions: panelActions,
    });

    if (item) {
      const confirming = confirmDeleteId === item.id;
      result.push({
        id: 'danger',
        actions: [
          {
            id: 'delete',
            label: t(
              confirming
                ? 'search.actions.confirmDelete'
                : 'search.results.delete',
            ),
            destructive: true,
            disabled: mutationPending,
            // The first choice arms deletion; only the second one deletes.
            keepOpen: !confirming,
            onSelect: () => {
              if (confirming) {
                void handleDelete(item);
              } else {
                setConfirmDeleteId(item.id);
              }
            },
          },
        ],
      });
    }
    return result;
  }

  if (formState) {
    const editedItem = formState.mode === 'edit' ? formState.item : undefined;
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          getPageSource={getPageSource}
          onCancel={() => setFormState(null)}
          onSaved={(continueCreating) =>
            handleSnippetSaved(formState.mode, continueCreating)
          }
        />
      </div>
    );
  }

  const total = pagination?.total ?? items.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SearchInputBar
        ref={inputRef}
        scope={scope}
        query={draftQuery}
        placeholder={
          toolsScope
            ? t('search.input.tools')
            : kind === 'vault'
              ? t('search.input.vault')
              : t('search.input.workspace')
        }
        loading={loading && hasLoaded && !toolsScope}
        labelFilter={
          !toolsScope && selectedLabelFilter
            ? getLocalizedLabelName(
                selectedLabelFilter.id,
                selectedLabelFilter.name,
                locale,
              )
            : undefined
        }
        activeDescendantId={
          !toolsScope && selectedItem
            ? getSearchResultOptionId(resultsId, selectedItem.id)
            : undefined
        }
        resultsId={toolsScope ? undefined : resultsId}
        onScopeChange={changeScope}
        onQueryChange={setDraftQuery}
        onCompositionChange={setComposing}
        onClearLabelFilter={() => {
          setSelectedLabelFilter(undefined);
          setPage(0);
          focusInput();
        }}
        onKeyDown={handleInputKeyDown}
      />

      {toolsScope ? (
        <ToolsView
          query={draftQuery.trim()}
          onOpen={(tool) => onOpenTool?.(tool)}
        />
      ) : (
        <SearchPanelResults
          sections={sections}
          error={error}
          initialLoading={loading && !hasLoaded}
          hasMore={hasMore}
          query={query}
          resultsId={resultsId}
          selectedItem={selectedItem}
          selectedLabelId={selectedLabelFilter?.id}
          emptyState={
            <EmptyState
              kind={kind}
              filtered={Boolean(query) || Boolean(selectedLabelFilter)}
              canStashPage={canStashPage}
              onCreate={() => setFormState({ mode: 'create' })}
              onStashPage={() => void stashCurrentPage()}
            />
          }
          formatDateTime={(timestamp) =>
            dateTimeFormatter.format(new Date(timestamp))
          }
          formatRelative={(item) =>
            formatRelativeTime(
              relativeFormatter,
              item.kind === 'workspace' ? item.expiresAt : item.updatedAt,
            )
          }
          onActivate={activate}
          onCopy={(item) => copySelected(item, false)}
          onLabelFilterToggle={(label) => {
            toggleLabelFilter(label);
            focusInput();
          }}
          onLoadMore={loadMore}
          onRetry={reload}
          onSelect={(item) => setSelectedId(item.id)}
        />
      )}

      <footer className="flex h-11 shrink-0 items-center gap-5 border-t bg-surface px-5 text-xs text-muted-foreground">
        <div className="-ml-2 flex min-w-0 flex-1 items-center gap-0.5">
          <FooterButton
            icon={Plus}
            label={t('search.footer.new')}
            onClick={startCreate}
          />
          {onOpenSettings ? (
            <FooterButton
              icon={Settings}
              label={t('search.footer.settings')}
              onClick={onOpenSettings}
            />
          ) : null}
          <span className="ml-2.5 min-w-0 truncate tabular-nums">
            {toolsScope || !hasLoaded
              ? null
              : t('search.footer.count', [total], total)}
          </span>
        </div>
        {toolsScope ? (
          <FooterHint keys={['↵']} label={t('search.hints.open')} />
        ) : selectedItem ? (
          <>
            <FooterHint
              className="hidden sm:flex"
              keys={['↑', '↓']}
              label={t('search.hints.navigate')}
            />
            <FooterHint keys={['↵']} label={t('search.actions.copy')} />
            <FooterHint
              className="hidden sm:flex"
              keys={[MOD_KEY, '↵']}
              label={t(
                selectedPageLinkUrl ? 'search.hints.open' : 'search.results.edit',
              )}
            />
          </>
        ) : null}
        <ActionMenu
          open={actionsOpen}
          label={t('search.actions.label')}
          sections={actionSections}
          portalContainer={portalContainer}
          onOpenChange={(open) => {
            setActionsOpen(open);
            if (!open) {
              setConfirmDeleteId(undefined);
              focusInput();
            }
          }}
        >
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-md hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setActionsOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
          >
            <span>{t('search.actions.label')}</span>
            <KbdGroup>
              <Kbd>{MOD_KEY}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </button>
        </ActionMenu>
      </footer>
    </div>
  );
}

/** Footer shortcut for mouse users; focus stays in the search field. */
function FooterButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 hover:bg-muted hover:text-foreground"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function FooterHint({
  keys,
  label,
  className,
}: {
  keys: readonly string[];
  label: string;
  className?: string;
}) {
  return (
    <span className={cn('flex shrink-0 items-center gap-1.5', className)}>
      <span>{label}</span>
      <KbdGroup>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
    </span>
  );
}

function EmptyState({
  kind,
  filtered,
  canStashPage,
  onCreate,
  onStashPage,
}: {
  kind: SearchPanelKind;
  filtered: boolean;
  canStashPage: boolean;
  onCreate: () => void;
  onStashPage: () => void;
}) {
  const { t } = useI18n();

  if (filtered) {
    return <p className="text-sm font-medium">{t('search.results.noMatches')}</p>;
  }

  return (
    <>
      <p className="text-sm font-medium">{t('search.results.noRecords')}</p>
      <p className="max-w-72 text-xs text-muted-foreground">
        {kind === 'vault'
          ? t('search.results.vaultEmpty')
          : t('search.results.workspaceEmpty')}
      </p>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onCreate}>
          {t(
            kind === 'workspace'
              ? 'search.actions.newTemporary'
              : 'search.actions.newSecret',
          )}
        </Button>
        {kind === 'workspace' && canStashPage ? (
          <Button type="button" size="sm" variant="ghost" onClick={onStashPage}>
            {t('search.stashPage')}
          </Button>
        ) : null}
      </div>
    </>
  );
}

function ToolsView({
  query,
  onOpen,
}: {
  query: string;
  onOpen: (tool: ExtensionTool) => void;
}) {
  const { t } = useI18n();
  const title = t('tools.json.title');
  const visible =
    !query ||
    `${title} json`.toLocaleLowerCase().includes(query.toLocaleLowerCase());

  if (!visible) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm font-medium">
        {t('search.results.noMatches')}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <ul
        role="listbox"
        aria-label={t('search.tabs.tools')}
        className="w-full bg-surface p-2.5 sm:w-[46%] sm:shrink-0"
      >
        <li
          role="option"
          aria-selected
          className="flex cursor-default items-center gap-3.5 rounded-lg bg-brand/10 px-3.5 py-3 dark:bg-brand/15"
          onDoubleClick={() => onOpen('json')}
        >
          <span
            className="flex w-5 shrink-0 justify-center text-brand-strong"
            aria-hidden="true"
          >
            <Braces className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
        </li>
      </ul>
      <div className="hidden min-w-0 flex-1 flex-col items-start gap-3 p-5 sm:flex">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          {t('tools.json.description')}
        </p>
        <Button type="button" size="sm" onClick={() => onOpen('json')}>
          {t('search.hints.open')}
        </Button>
      </div>
    </div>
  );
}

function appendUnique(
  current: SearchPanelItem[],
  next: SearchPanelItem[],
): SearchPanelItem[] {
  const seen = new Set(current.map((item) => `${item.kind}:${item.id}`));
  return [
    ...current,
    ...next.filter((item) => !seen.has(`${item.kind}:${item.id}`)),
  ];
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

function formatRelativeTime(
  formatter: Intl.RelativeTimeFormat,
  timestamp: number,
): string {
  const delta = timestamp - Date.now();
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(delta) >= size) {
      return formatter.format(Math.round(delta / size), unit);
    }
  }
  return formatter.format(0, 'minute');
}

function getWorkspaceActionErrorTitle(
  action: 'extend' | 'promote',
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

async function readCurrentDocumentSource(): Promise<PageSource | null> {
  return readDocumentSource();
}
