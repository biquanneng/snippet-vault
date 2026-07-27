// SPDX-License-Identifier: MPL-2.0

import { type ReactNode, type Ref, useEffect, useState } from "react";
import { BriefcaseBusiness, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type DeleteItemData,
  type ExtensionResponse,
  type SearchPanelData,
  type SearchPanelItem,
  type SearchPanelKind,
  type SearchPanelRequest,
} from "../../../lib/browser/message-contract";
import { useI18n } from "../../../lib/use-i18n";
import { SearchInputBar } from "./SearchInputBar";
import { getMutationStatusMessages } from "./mutation-status";
import { SearchPanelResults } from "./SearchPanelResults";
import { SnippetForm } from "./SnippetForm";

const PAGE_SIZE = 12;

type SnippetFormState =
  | { mode: "create" }
  | { mode: "edit"; item: SearchPanelItem };

interface SearchPanelContentProps {
  inputRef: Ref<HTMLInputElement>;
  portalContainer?: HTMLElement;
  toolbarEnd?: ReactNode;
  requestSender?: SearchPanelRequestSender;
}

export type SearchPanelRequestSender = (
  request: SearchPanelRequest,
) => Promise<ExtensionResponse<SearchPanelData>>;

export function SearchPanelContent({
  inputRef,
  portalContainer,
  toolbarEnd,
  requestSender = sendSearchPanelRequest,
}: SearchPanelContentProps) {
  const { locale, t } = useI18n();
  const [kind, setKind] = useState<SearchPanelKind>("vault");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<SearchPanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<SnippetFormState | null>(null);
  const formOpen = formState !== null;

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
        console.error("[SnippetVault] Search request failed", {
          code: response.error.code,
          message: response.error.message,
          kind,
          operation: submittedQuery.trim() ? "search" : "browse",
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
  }, [kind, locale, page, refreshKey, requestSender, submittedQuery]);

  function submitQuery(nextQuery: string) {
    if (formOpen) {
      return;
    }
    setDraftQuery(nextQuery);
    setSubmittedQuery(nextQuery);
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function clearQuery() {
    if (formOpen) {
      return;
    }
    setDraftQuery("");
    setSubmittedQuery("");
    setPage(0);
    setRefreshKey((current) => current + 1);
  }

  function changeKind(value: string) {
    if (
      formOpen ||
      (value !== "vault" && value !== "workspace")
    ) {
      return;
    }
    setKind(value);
    setPage(0);
    setData(null);
  }

  async function handleDelete(item: SearchPanelItem) {
    const response = await sendExtensionMessage<DeleteItemData>({
      type: MESSAGE_TYPE.deleteItem,
      payload: { kind: item.kind, id: item.id },
    });

    if (!response.ok) {
      console.error("[SnippetVault] Delete failed", response.error);
      toast.error(t("search.results.deleteFailed"), {
        description: response.error.message,
      });
      return;
    }

    // Remove the deleted item from the current data and refresh
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.filter((i) => i.id !== item.id),
          }
        : current,
    );
    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t("search.results.deleted"), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(" · ") }
        : {}),
    });
    setRefreshKey((current) => current + 1);
  }

  function openCreateForm() {
    setFormState({ mode: "create" });
  }

  function openEditForm(item: SearchPanelItem) {
    setFormState({ mode: "edit", item });
  }

  function refreshResults() {
    if (formOpen || loading) {
      return;
    }
    setData(null);
    setRefreshKey((current) => current + 1);
  }

  function handleSnippetSaved(mode: SnippetFormState["mode"]) {
    setFormState(null);
    if (mode === "create") {
      setDraftQuery("");
      setSubmittedQuery("");
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
      onDelete={handleDelete}
      onEdit={openEditForm}
      onPageChange={setPage}
      onRetry={() => setRefreshKey((current) => current + 1)}
    />
  );
  const editedItem =
    formState?.mode === "edit" ? formState.item : undefined;
  const panelBody = formState ? (
    <SnippetForm
      key={
        editedItem
          ? `${editedItem.kind}:${editedItem.id}:${editedItem.updatedAt}`
          : `create:${kind}`
      }
      kind={editedItem?.kind ?? kind}
      item={editedItem}
      portalContainer={portalContainer}
      onCancel={() => setFormState(null)}
      onSaved={() => handleSnippetSaved(formState.mode)}
    />
  ) : (
    results
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain">
      <header className="shrink-0 border-b px-4">
        <SearchInputBar
          ref={inputRef}
          kind={kind}
          query={draftQuery}
          disabled={formOpen}
          onClear={clearQuery}
          onQueryChange={setDraftQuery}
          onSearch={submitQuery}
        />
      </header>

      <Tabs
        value={kind}
        onValueChange={changeKind}
        className="min-h-0 flex-1 gap-0 overflow-hidden"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2">
          <TabsList>
            <TabsTrigger
              value="vault"
              className="px-2"
              disabled={formOpen}
            >
              <ShieldCheck aria-hidden="true" />
              {t("search.tabs.vault")}
            </TabsTrigger>
            <TabsTrigger
              value="workspace"
              className="px-2"
              disabled={formOpen}
            >
              <BriefcaseBusiness aria-hidden="true" />
              {t("search.tabs.workspace")}
            </TabsTrigger>
          </TabsList>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant={
                formState?.mode === "create" ? "secondary" : "outline"
              }
              size="sm"
              disabled={formOpen}
              aria-pressed={formState?.mode === "create"}
              onClick={openCreateForm}
            >
              <Plus aria-hidden="true" />
              {t("search.create.open")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={formOpen || loading}
              onClick={refreshResults}
              aria-label={t("search.refresh")}
              title={t("search.refresh")}
            >
              <RefreshCw
                aria-hidden="true"
                className={loading ? "animate-spin" : ""}
              />
            </Button>
            {toolbarEnd && !formOpen ? (
              <div className="flex items-center gap-1 border-l border-border pl-2">
                {toolbarEnd}
              </div>
            ) : null}
          </div>
        </div>
        <TabsContent
          value="vault"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {kind === "vault" ? panelBody : null}
        </TabsContent>
        <TabsContent
          value="workspace"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {kind === "workspace" ? panelBody : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const sendSearchPanelRequest: SearchPanelRequestSender = (request) =>
  sendExtensionMessage<SearchPanelData>(request);
