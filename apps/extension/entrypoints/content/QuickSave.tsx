// SPDX-License-Identifier: MPL-2.0

import { useEffect, useRef, useState, type RefObject } from "react";
import { CircleCheck, Info, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import {
  MESSAGE_TYPE,
  sendExtensionMessage,
  type DeleteItemData,
  type PromoteWorkspaceItemData,
  type RestoreWorkspaceExpiryData,
  type SavePageLinkData,
  type SaveSelectionData,
} from "../../lib/browser/message-contract";
import { toIntlLocale } from "../../lib/i18n-catalog";
import { getQuickSaveTarget } from "../../lib/quick-save-target";
import { detectLabelIds } from "../../lib/secret-detection";
import { useI18n } from "../../lib/use-i18n";
import type {
  SelectionTooltipSuppressionRule,
  SelectionTooltipSuppressionScope,
} from "../../lib/selection-tooltip-suppression";
import {
  getSelectableTextControl,
  isEditableTarget,
  isSelectionBoxVisible,
  isSnippetVaultUiEvent,
  readSelectionSnapshot,
  readTextControlSnapshot,
  type SelectionSnapshot,
} from "./selection";
import {
  clearCapturedSelectionHighlight,
  showCapturedSelectionHighlight,
} from "./selection-highlight";
import {
  getSelectionTooltipShortcutPlatform,
  isSelectionTooltipCopyShortcut,
  SelectionTooltipShortcutDetector,
  type SelectionTooltipSelectionIdentity,
} from "./selection-tooltip-shortcut";

const QUICK_SAVE_TOAST_MS = 6_000;
const SAVE_FLASH_MS = 600;
const DAY_MS = 24 * 60 * 60 * 1_000;

interface QuickSaveProps {
  canSuppressSite: boolean;
  /** Brings the content layer above host top-layer elements before a toast. */
  onBeforeFeedback: () => void;
  onSuppress: (
    scope: SelectionTooltipSuppressionScope,
  ) => Promise<SelectionTooltipSuppressionRule>;
  onRestoreSuppression: (
    rule: SelectionTooltipSuppressionRule,
  ) => Promise<void>;
}

/**
 * Saves the selection on the second copy of `Cmd/Ctrl+C+C` without any
 * further interaction. The first copy stays entirely native.
 */
export function QuickSave({
  canSuppressSite,
  onBeforeFeedback,
  onSuppress,
  onRestoreSuppression,
}: QuickSaveProps) {
  const { t } = useI18n();
  const savingRef = useRef(false);
  // Listeners are installed once; they read the latest props through a ref.
  const latestRef = useRef({
    canSuppressSite,
    onBeforeFeedback,
    onSuppress,
    onRestoreSuppression,
    t,
  });
  latestRef.current = {
    canSuppressSite,
    onBeforeFeedback,
    onSuppress,
    onRestoreSuppression,
    t,
  };

  useEffect(() => {
    const shortcutPlatform = getSelectionTooltipShortcutPlatform(
      navigator.platform || navigator.userAgent,
    );
    const shortcutDetector = new SelectionTooltipShortcutDetector(
      shortcutPlatform,
    );
    let flashTimer: number | null = null;

    const flashSelection = (range: Range) => {
      showCapturedSelectionHighlight(range);
      if (flashTimer !== null) {
        window.clearTimeout(flashTimer);
      }
      flashTimer = window.setTimeout(() => {
        flashTimer = null;
        clearCapturedSelectionHighlight();
      }, SAVE_FLASH_MS);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isSnippetVaultUiEvent(event) ||
        !isSelectionTooltipCopyShortcut(event, shortcutPlatform)
      ) {
        shortcutDetector.reset();
        return;
      }

      const pageIdentity = readPageLinkIdentity(event.target);
      if (pageIdentity) {
        if (shortcutDetector.register(event, pageIdentity) !== "matched") {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        void savePageLink();
        return;
      }

      const capture = readCopyCapture(event.target);
      if (
        !capture ||
        !isSelectionBoxVisible(capture.snapshot.box, {
          width: window.innerWidth,
          height: window.innerHeight,
        })
      ) {
        shortcutDetector.reset();
        return;
      }

      const shortcutState = shortcutDetector.register(event, capture.identity);
      if (shortcutState !== "matched") {
        // The first copy arms the shortcut without touching the clipboard.
        return;
      }

      // The first press already copied the text; only the second is ours.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (capture.range) {
        flashSelection(capture.range);
      }
      void saveSnapshot(capture.snapshot);
    };

    const resetShortcut = () => shortcutDetector.reset();

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("pointerup", resetShortcut, true);
    window.addEventListener("blur", resetShortcut);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("pointerup", resetShortcut, true);
      window.removeEventListener("blur", resetShortcut);
      if (flashTimer !== null) {
        window.clearTimeout(flashTimer);
      }
      clearCapturedSelectionHighlight();
    };
  }, []);

  async function savePageLink() {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    const { t: translate, onBeforeFeedback: raise } = latestRef.current;
    try {
      const target = await getQuickSaveTarget();
      const response = await sendExtensionMessage<SavePageLinkData>({
        type: MESSAGE_TYPE.savePageLink,
        payload: { temporary: target === "workspace" },
      });
      raise();
      if (!response.ok) {
        toast.error(translate("quickSave.saveFailed"), {
          description: response.error.message,
        });
        return;
      }
      showQuickSaveToast(
        { ...response.data, duplicate: response.data.outcome === "duplicate" },
        response.data,
      );
    } finally {
      savingRef.current = false;
    }
  }

  function showQuickSaveToast(
    saved: SaveSelectionData,
    pageLink?: PageLinkOutcome,
  ) {
    const toastId = `quick-save:${saved.id}:${Date.now()}`;
    // Sonner only re-measures a toast's height when the toast itself is
    // updated, so toggling "More" re-issues it under the same id.
    const showToast = (showMore: boolean) => {
      toast.custom(
        () => (
          <QuickSaveToast
            toastId={toastId}
            saved={saved}
            pageLink={pageLink}
            latestRef={latestRef}
            showMore={showMore}
            onToggleMore={() => showToast(!showMore)}
          />
        ),
        { id: toastId, duration: QUICK_SAVE_TOAST_MS },
      );
    };
    showToast(false);
  }

  async function saveSnapshot(snapshot: SelectionSnapshot) {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    const { t: translate, onBeforeFeedback: raise } = latestRef.current;
    try {
      const target = await getQuickSaveTarget();
      const response = await sendExtensionMessage<SaveSelectionData>({
        type: MESSAGE_TYPE.saveSelection,
        payload: {
          content: snapshot.markdown,
          labelIds: detectLabelIds(snapshot.markdown),
          temporary: target === "workspace",
          ...(document.title ? { sourceTitle: document.title } : {}),
        },
      });

      raise();
      if (!response.ok) {
        toast.error(translate("quickSave.saveFailed"), {
          description: response.error.message,
        });
        return;
      }
      showQuickSaveToast(response.data);
    } finally {
      savingRef.current = false;
    }
  }

  return null;
}

type PageLinkOutcome = Pick<
  SavePageLinkData,
  "outcome" | "previousExpiresAt"
>;

interface QuickSaveToastProps {
  toastId: string | number;
  saved: SaveSelectionData;
  /** Set when the current page was stashed instead of a selection. */
  pageLink?: PageLinkOutcome;
  showMore: boolean;
  onToggleMore: () => void;
  latestRef: RefObject<{
    canSuppressSite: boolean;
    onBeforeFeedback: () => void;
    onSuppress: QuickSaveProps["onSuppress"];
    onRestoreSuppression: QuickSaveProps["onRestoreSuppression"];
    t: ReturnType<typeof useI18n>["t"];
  }>;
}

type ToastAction = "undo" | "promote" | SelectionTooltipSuppressionScope;

function QuickSaveToast({
  toastId,
  saved,
  pageLink,
  latestRef,
  showMore,
  onToggleMore,
}: QuickSaveToastProps) {
  const { locale, t } = useI18n();
  const [pending, setPending] = useState<ToastAction | null>(null);
  const { canSuppressSite } = latestRef.current;
  const workspace = saved.kind === "workspace";
  const days =
    saved.expiresAt === undefined
      ? 0
      : Math.max(1, Math.round((saved.expiresAt - Date.now()) / DAY_MS));

  // The page URL is never shown: its query may carry signatures or tokens.
  const title = saved.duplicate
    ? t("quickSave.duplicate")
    : pageLink?.outcome === "extended"
      ? t("quickSave.pageExtended")
      : pageLink
        ? t("quickSave.savedPage")
        : workspace
          ? t("quickSave.savedWorkspace")
          : t("quickSave.savedVault");
  const description = saved.duplicate
    ? workspace
      ? t("quickSave.duplicateWorkspace")
      : t("quickSave.duplicateVault")
    : workspace
      ? t("quickSave.expiresIn", [
          new Intl.NumberFormat(toIntlLocale(locale)).format(days),
        ])
      : undefined;

  async function run(action: ToastAction) {
    if (pending) {
      return;
    }
    setPending(action);
    try {
      if (action === "undo") {
        await undoSave();
      } else if (action === "promote") {
        await promote();
      } else {
        await suppress(action);
      }
    } finally {
      setPending(null);
    }
  }

  async function undoSave() {
    const previousExpiresAt =
      pageLink?.outcome === "extended" ? pageLink.previousExpiresAt : undefined;
    // An extended link is undone by restoring its expiry, not by deleting it.
    const response =
      previousExpiresAt === undefined
        ? await sendExtensionMessage<DeleteItemData>({
            type: MESSAGE_TYPE.deleteItem,
            payload: { kind: saved.kind, id: saved.id },
          })
        : await sendExtensionMessage<RestoreWorkspaceExpiryData>({
            type: MESSAGE_TYPE.restoreWorkspaceExpiry,
            payload: {
              id: saved.id,
              expectedUpdatedAt: saved.updatedAt,
              expiresAt: previousExpiresAt,
            },
          });
    toast.dismiss(toastId);
    if (!response.ok) {
      toast.error(t("quickSave.undoFailed"), {
        description: response.error.message,
      });
      return;
    }
    toast(t("quickSave.undone"));
  }

  async function promote() {
    const response = await sendExtensionMessage<PromoteWorkspaceItemData>({
      type: MESSAGE_TYPE.promoteWorkspaceItem,
      payload: { id: saved.id, expectedUpdatedAt: saved.updatedAt },
    });
    toast.dismiss(toastId);
    if (!response.ok) {
      toast.error(t("quickSave.promoteFailed"), {
        description: response.error.message,
      });
      return;
    }
    toast.success(t("quickSave.promoted"));
  }

  async function suppress(scope: SelectionTooltipSuppressionScope) {
    const { onSuppress, onRestoreSuppression } = latestRef.current;
    toast.dismiss(toastId);
    try {
      const rule = await onSuppress(scope);
      toast(
        t(
          scope === "page"
            ? "tooltip.suppression.pageSaved"
            : "tooltip.suppression.siteSaved",
        ),
        {
          duration: 8_000,
          action: {
            label: t("tooltip.suppression.undo"),
            onClick: () => {
              void onRestoreSuppression(rule)
                .then(() => {
                  toast(t("tooltip.suppression.restored"));
                })
                .catch((error: unknown) => {
                  console.error(
                    "[SnippetVault] Failed to undo a quick save exception",
                    error,
                  );
                  toast.error(t("tooltip.suppression.undoFailed"));
                });
            },
          },
        },
      );
    } catch (error: unknown) {
      console.error(
        "[SnippetVault] Failed to save a quick save exception",
        error,
      );
      toast.error(t("tooltip.suppression.saveFailed"));
    }
  }

  return (
    <div
      data-snippet-vault-ui="true"
      className="pointer-events-auto w-full space-y-2.5 rounded-xl border bg-popover p-3 font-sans text-popover-foreground shadow-lg sm:w-sm"
    >
      <div className="flex items-start gap-2">
        {saved.duplicate ? (
          <Info
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          // Success shows only in the icon, in sonner's success color.
          <CircleCheck
            className="mt-0.5 size-4 shrink-0 text-(--success-text)"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {saved.duplicate ? null : (
          <Button
            type="button"
            size="xs"
            variant="secondary"
            disabled={pending !== null}
            aria-busy={pending === "undo"}
            onClick={() => void run("undo")}
          >
            {pending === "undo" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {t("quickSave.undo")}
          </Button>
        )}
        {workspace ? (
          <Button
            type="button"
            size="xs"
            variant="secondary"
            disabled={pending !== null}
            aria-busy={pending === "promote"}
            onClick={() => void run("promote")}
          >
            {pending === "promote" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {t("quickSave.promote")}
          </Button>
        ) : null}
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          aria-expanded={showMore}
          disabled={pending !== null}
          onClick={onToggleMore}
        >
          {t("quickSave.more")}
        </Button>
      </div>
      {showMore ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t pt-2.5">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending !== null}
            onClick={() => void run("page")}
          >
            {t("tooltip.suppression.pageAction")}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            disabled={pending !== null || !canSuppressSite}
            title={
              canSuppressSite
                ? undefined
                : t("tooltip.suppression.siteUnavailable")
            }
            onClick={() => void run("site")}
          >
            {t("tooltip.suppression.siteAction")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface CopyCapture {
  snapshot: SelectionSnapshot;
  identity: SelectionTooltipSelectionIdentity;
  /** Page selections flash on save; text controls show their own selection. */
  range: Range | null;
}

/**
 * With nothing selected outside editable fields, Cmd/Ctrl+C+C stashes the
 * current http(s) page. Returns the identity both presses must share.
 */
function readPageLinkIdentity(
  target: EventTarget | null,
): SelectionTooltipSelectionIdentity | null {
  if (
    isEditableTarget(target) ||
    getSelectableTextControl(target) ||
    (location.protocol !== "http:" && location.protocol !== "https:")
  ) {
    return null;
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && selection.toString().trim()) {
    return null;
  }
  return {
    startContainer: document,
    startOffset: 0,
    endContainer: document,
    endOffset: 0,
    markdown: location.href,
  };
}

function readCopyCapture(target: EventTarget | null): CopyCapture | null {
  const control = getSelectableTextControl(target);
  if (control) {
    const snapshot = readTextControlSnapshot(control);
    return snapshot
      ? {
          snapshot,
          identity: {
            startContainer: control,
            startOffset: snapshot.start,
            endContainer: control,
            endOffset: snapshot.end,
            markdown: snapshot.markdown,
          },
          range: null,
        }
      : null;
  }

  // Other editable surfaces (password fields, rich-text editors) stay native.
  if (isEditableTarget(target)) {
    return null;
  }

  const selection = window.getSelection();
  const snapshot = readSelectionSnapshot(selection);
  if (!selection || !snapshot) {
    return null;
  }
  return {
    snapshot,
    identity: createSelectionIdentity(selection, snapshot),
    range: selection.getRangeAt(0).cloneRange(),
  };
}

function createSelectionIdentity(
  selection: Selection,
  snapshot: SelectionSnapshot,
): SelectionTooltipSelectionIdentity {
  const range = selection.getRangeAt(0);
  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    markdown: snapshot.markdown,
  };
}
