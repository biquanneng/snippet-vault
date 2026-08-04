// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { ContextMarker } from "../../components/context-marker";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  MAX_LABEL_NAME_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type CreateLabelData,
  type ContextPresetListData,
  type ContextPresetSummary,
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
} from "../../lib/browser/message-contract";
import {
  calculateTooltipPosition,
  getRangeSelectionBox,
  isEditableTarget,
  isKeyboardSelectionEvent,
  isSelectionBoxVisible,
  isSnippetVaultUiEvent,
  readSelectionSnapshot,
  type SelectionSnapshot,
  type TooltipPosition,
} from "./selection";
import {
  clearCapturedSelectionHighlight,
  showCapturedSelectionHighlight,
} from "./selection-highlight";
import {
  getLocalizedLabelName,
} from "../../lib/localized-values";
import { toIntlLocale, type SupportedLocale } from "../../lib/i18n-catalog";
import { useI18n } from "../../lib/use-i18n";
import { cn } from "../../lib/utils";
import type {
  SelectionTooltipSuppressionRule,
  SelectionTooltipSuppressionScope,
} from "../../lib/selection-tooltip-suppression";

const VIEWPORT_GUTTER = 24;
const ESTIMATED_TOOLTIP_SIZE = {
  width: 672,
  height: 128,
};
const MAX_VISIBLE_LABELS = 8;
const NARROW_MAX_VISIBLE_LABELS = 5;
const COMPACT_MAX_VISIBLE_LABELS = 3;
const COMPACT_VIEWPORT_WIDTH = 360;
const CLOSING_ANIMATION_MS = 150;

interface SelectionTooltipProps {
  portalContainer: HTMLElement;
  canSuppressSite: boolean;
  onSuppress: (
    scope: SelectionTooltipSuppressionScope,
  ) => Promise<SelectionTooltipSuppressionRule>;
  onRestoreSuppression: (
    rule: SelectionTooltipSuppressionRule,
  ) => Promise<void>;
}

export function SelectionTooltip({
  portalContainer,
  canSuppressSite,
  onSuppress,
  onRestoreSuppression,
}: SelectionTooltipProps) {
  const { locale, t } = useI18n();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const closingTimerRef = useRef<number | null>(null);
  const viewportUpdateFrameRef = useRef<number | null>(null);
  const uiPointerActiveRef = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [contexts, setContexts] = useState<ContextPresetSummary[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [contextId, setContextId] = useState<string>();
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const [labelEditorOpen, setLabelEditorOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suppressionMenuOpen, setSuppressionMenuOpen] = useState(false);
  const [suppressingScope, setSuppressingScope] =
    useState<SelectionTooltipSuppressionScope | null>(null);

  useEffect(() => {
    const updateTooltipFromSavedRange = () => {
      viewportUpdateFrameRef.current = null;
      const savedRange = savedRangeRef.current;
      if (!savedRange) {
        hideTooltip();
        return;
      }

      const box = getRangeSelectionBox(savedRange);
      const viewport = viewportSize();
      if (!box || !isSelectionBoxVisible(box, viewport)) {
        hideTooltip();
        return;
      }

      setSelection((current) =>
        current
          ? {
              ...current,
              box,
            }
          : current,
      );
    };

    const scheduleViewportUpdate = (event: Event) => {
      if (
        isSnippetVaultUiEvent(event) ||
        viewportUpdateFrameRef.current !== null
      ) {
        return;
      }

      viewportUpdateFrameRef.current = window.requestAnimationFrame(
        updateTooltipFromSavedRange,
      );
    };

    const updateSelection = (event: Event) => {
      if (uiPointerActiveRef.current) {
        uiPointerActiveRef.current = false;
        return;
      }
      if (isSnippetVaultUiEvent(event)) {
        return;
      }
      if (isEditableTarget(event.target)) {
        hideTooltip();
        return;
      }

      // Capture the range before the RAF. Tooltip controls may receive focus
      // before the deferred snapshot is read and collapse the native selection.
      const currentSelection = window.getSelection();
      if (currentSelection && !currentSelection.isCollapsed) {
        const savedRange = currentSelection.getRangeAt(0).cloneRange();
        savedRangeRef.current = savedRange;
        showCapturedSelectionHighlight(savedRange);
      }

      window.requestAnimationFrame(() => {
        const snapshot = readSelectionSnapshot();
        if (!snapshot) {
          hideTooltip();
          return;
        }

        void loadOptions();
        setSelection(snapshot);
        resetForm();
        setPosition(
          calculateTooltipPosition(
            snapshot.box,
            ESTIMATED_TOOLTIP_SIZE,
            viewportSize(),
          ),
        );
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideTooltip();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (isKeyboardSelectionEvent(event)) {
        updateSelection(event);
      }
    };

    document.addEventListener("pointerup", updateSelection, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", scheduleViewportUpdate);
    window.addEventListener("scroll", scheduleViewportUpdate, true);

    return () => {
      document.removeEventListener("pointerup", updateSelection, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", scheduleViewportUpdate);
      window.removeEventListener("scroll", scheduleViewportUpdate, true);
      savedRangeRef.current = null;
      clearCapturedSelectionHighlight();
      clearHideTimer();
      clearClosingTimer();
      if (viewportUpdateFrameRef.current !== null) {
        window.cancelAnimationFrame(viewportUpdateFrameRef.current);
        viewportUpdateFrameRef.current = null;
      }
    };
  }, [t]);

  useLayoutEffect(() => {
    if (!selection || !tooltipRef.current) {
      return;
    }

    const rect = tooltipRef.current.getBoundingClientRect();
    setPosition(
      calculateTooltipPosition(
        selection.box,
        { width: rect.width, height: rect.height },
        viewportSize(),
      ),
    );
    setReady(true);
  }, [
    creatingLabel,
    contextId,
    labelsExpanded,
    labels.length,
    labelsLoading,
    saving,
    selectedLabelIds,
    selection,
    locale,
  ]);

  async function loadOptions() {
    setLabelsLoading(true);
    const [labelResponse, contextResponse] = await Promise.all([
      sendExtensionMessage<LabelListData>({
        type: MESSAGE_TYPE.getLabels,
      }),
      sendExtensionMessage<ContextPresetListData>({
        type: MESSAGE_TYPE.getContextPresets,
      }),
    ]);
    setLabelsLoading(false);

    if (!labelResponse.ok) {
      toast.error(t("tooltip.labelLoadFailed"), {
        description: labelResponse.error.message,
      });
    } else {
      setLabels(labelResponse.data.labels);
    }

    if (!contextResponse.ok) {
      setContexts([]);
      toast.error(t("tooltip.contextLoadFailed"), {
        description: contextResponse.error.message,
      });
    } else {
      setContexts(contextResponse.data.contextPresets);
      setContextId((current) =>
        current &&
        contextResponse.data.contextPresets.some(
          (context) => context.id === current,
        )
          ? current
          : undefined,
      );
    }
  }

  async function createAndSelectLabel() {
    if (creatingLabel || labelsLoading || saving) {
      return;
    }

    const name = labelInput.trim();
    if (!name) {
      toast.error(t("tooltip.labelRequired"));
      return;
    }

    const existing = findLabelByName(labels, name, locale);
    if (existing) {
      addLabelToSelection(existing);
      setLabels((current) => promoteLabel(current, existing));
      setLabelInput("");
      toast.success(
        t("tooltip.labelSelected", [
          getLocalizedLabelName(existing.id, existing.name, locale),
        ]),
      );
      return;
    }

    setCreatingLabel(true);
    const response = await sendExtensionMessage<CreateLabelData>({
      type: MESSAGE_TYPE.createLabel,
      payload: { name },
    });
    setCreatingLabel(false);

    if (!response.ok) {
      toast.error(t("tooltip.labelSaveFailed"), {
        description: response.error.message,
      });
      focusLabelInput();
      return;
    }

    const { label, created } = response.data;
    setLabels((current) => promoteLabel(current, label));
    addLabelToSelection(label);
    setLabelInput("");
    toast.success(
      created
        ? t("tooltip.labelCreatedSelected", [
            getLocalizedLabelName(label.id, label.name, locale),
          ])
        : t("tooltip.labelSelected", [
            getLocalizedLabelName(label.id, label.name, locale),
          ]),
    );
    focusLabelInput();
  }

  function handleLabelInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setLabelInput("");
      setLabelEditorOpen(false);
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void createAndSelectLabel();
  }

  function addLabelToSelection(label: LabelSummary) {
    setSelectedLabelIds((current) =>
      current.includes(label.id) ? current : [...current, label.id],
    );
  }

  function toggleLabelSelection(label: LabelSummary) {
    setSelectedLabelIds((current) =>
      current.includes(label.id)
        ? current.filter((labelId) => labelId !== label.id)
        : [...current, label.id],
    );
  }

  function focusLabelInput() {
    window.requestAnimationFrame(() => {
      labelInputRef.current?.focus({ preventScroll: true });
    });
  }

  function openLabelEditor() {
    setLabelEditorOpen(true);
    focusLabelInput();
  }

  async function saveSelection() {
    if (!selection || saving || creatingLabel) {
      return;
    }
    setSaving(true);
    const response = await sendExtensionMessage<SaveSelectionData>({
      type: MESSAGE_TYPE.saveSelection,
      payload: {
        content: selection.markdown,
        labelIds: selectedLabelIds,
        temporary: false,
        ...(contextId ? { contextId } : {}),
        ...(document.title ? { sourceTitle: document.title } : {}),
      },
    });
    setSaving(false);

    if (!response.ok) {
      toast.error(t("tooltip.saveFailed"), {
        description: response.error.message,
      });
      return;
    }

    setSaved(true);
    const statusMessages = [
      contextId
        ? t("tooltip.statusContext", [
            contexts.find((context) => context.id === contextId)?.name ??
              contextId,
          ])
        : null,
      response.data.searchStatus === "rebuild-required"
        ? t("tooltip.indexRebuild")
        : null,
      response.data.labelStatus === "stale"
        ? t("tooltip.labelOrderStale")
        : null,
    ].filter((message): message is string => message !== null);

    toast.success(t("tooltip.saved"), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(" · ") }
        : {}),
    });
    setLabels((current) => promoteLabels(current, selectedLabelIds));
    window.getSelection()?.removeAllRanges();
    savedRangeRef.current = null;
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(hideTooltip, 400);
  }

  async function suppressTooltip(scope: SelectionTooltipSuppressionScope) {
    if (suppressingScope) {
      return;
    }

    setSuppressingScope(scope);
    try {
      const rule = await onSuppress(scope);
      setSuppressionMenuOpen(false);
      toast(
        t(
          scope === "page"
            ? "tooltip.suppression.pageSaved"
            : "tooltip.suppression.siteSaved",
        ),
        {
          duration: 8000,
          action: {
            label: t("tooltip.suppression.undo"),
            onClick: () => {
              void onRestoreSuppression(rule)
                .then(() => {
                  toast(t("tooltip.suppression.restored"));
                })
                .catch((error: unknown) => {
                  console.error(
                    "[SnippetVault] Failed to undo a selection tooltip exception",
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
        "[SnippetVault] Failed to save a selection tooltip exception",
        error,
      );
      setSuppressionMenuOpen(false);
      toast.error(t("tooltip.suppression.saveFailed"));
    } finally {
      setSuppressingScope(null);
    }
  }

  function resetForm() {
    setSelectedLabelIds([]);
    setLabelInput("");
    setContextId(undefined);
    setCreatingLabel(false);
    setSaving(false);
    setLabelsExpanded(false);
    setLabelEditorOpen(false);
    setClosing(false);
    setSaved(false);
    setReady(false);
    setSuppressionMenuOpen(false);
    setSuppressingScope(null);
    clearClosingTimer();
  }

  function hideTooltip() {
    clearHideTimer();
    if (closingTimerRef.current !== null) {
      return;
    }
    savedRangeRef.current = null;
    clearCapturedSelectionHighlight();
    setClosing(true);
    closingTimerRef.current = window.setTimeout(() => {
      setSelection(null);
      setPosition(null);
      closingTimerRef.current = null;
      resetForm();
    }, CLOSING_ANIMATION_MS);
  }

  function clearHideTimer() {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function clearClosingTimer() {
    if (closingTimerRef.current !== null) {
      window.clearTimeout(closingTimerRef.current);
      closingTimerRef.current = null;
    }
  }

  if ((!selection && !closing) || !position) {
    return null;
  }

  const busy =
    creatingLabel || labelsLoading || saving || suppressingScope !== null;
  const maximumVisibleLabels =
    window.innerWidth < COMPACT_VIEWPORT_WIDTH
      ? COMPACT_MAX_VISIBLE_LABELS
      : window.innerWidth <
          ESTIMATED_TOOLTIP_SIZE.width + VIEWPORT_GUTTER
        ? NARROW_MAX_VISIBLE_LABELS
        : MAX_VISIBLE_LABELS;
  const collapsedLabels = getVisibleLabels(
    labels,
    selectedLabelIds,
    maximumVisibleLabels,
  );
  const displayedLabels = labelsExpanded
    ? labels
    : collapsedLabels;
  const hiddenLabelCount = Math.max(
    0,
    labels.length - collapsedLabels.length,
  );
  const selectedLabelIdSet = new Set(selectedLabelIds);
  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    maxWidth: Math.max(0, window.innerWidth - VIEWPORT_GUTTER),
  };

  return (
    <div
      ref={tooltipRef}
      data-snippet-vault-ui="true"
      className={cn(
        "pointer-events-auto fixed z-50 isolate w-2xl rounded-2xl bg-popover p-3 font-sans text-popover-foreground shadow-xl outline-none",
        closing
          ? "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:zoom-out-95"
          : ready && "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95",
        !ready && !closing && "invisible",
      )}
      style={style}
      role="toolbar"
      aria-label={t("tooltip.toolbarLabel")}
      data-placement={position.placement}
      onPointerDownCapture={() => {
        uiPointerActiveRef.current = true;
      }}
      onPointerCancelCapture={() => {
        uiPointerActiveRef.current = false;
      }}
    >
      <div
        className={
          labelsExpanded
            ? "-m-1 flex flex-wrap content-start items-center gap-1 p-1"
            : "flex flex-wrap content-start items-center gap-1"
        }
        role="group"
        aria-label={t("tooltip.labelGroup")}
        onKeyDown={handleLabelGroupKeyDown}
      >
        <span className="inline-flex h-7 shrink-0 basis-full items-center px-1 mb-0.5 text-sm text-muted-foreground">
          {t("tooltip.labelPrompt")}
        </span>

        {labelsExpanded && hiddenLabelCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-expanded="true"
            onClick={() => setLabelsExpanded(false)}
            className="shrink-0"
          >
            <ChevronUp aria-hidden="true" />
            {t("tooltip.collapseLabels")}
          </Button>
        ) : null}

        {labelsLoading ? (
          <LoaderCircle
            className="size-3.5 animate-spin text-muted-foreground"
            aria-label={t("tooltip.loadingLabels")}
          />
        ) : null}

        {!labelsLoading && labels.length === 0 ? (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("tooltip.noLabelsHint")}
          </span>
        ) : null}

        {displayedLabels.map((label) => {
          const selected = selectedLabelIdSet.has(label.id);
          return (
            <Badge
              key={label.id}
              asChild
              variant={selected ? "default" : "outline"}
              className="h-7 max-w-36 rounded-md text-sm disabled:pointer-events-none disabled:opacity-50"
            >
              <button
                type="button"
                disabled={busy}
                aria-pressed={selected}
                title={getLocalizedLabelName(label.id, label.name, locale)}
                onClick={() => toggleLabelSelection(label)}
              >
                {selected ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : null}
                <span className="truncate">
                  {getLocalizedLabelName(label.id, label.name, locale)}
                </span>
              </button>
            </Badge>
          );
        })}

        {!labelsExpanded && hiddenLabelCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            aria-expanded="false"
            onClick={() => setLabelsExpanded(true)}
            className="shrink-0"
          >
            <ChevronDown aria-hidden="true" />
            {t("tooltip.expandLabels", [hiddenLabelCount])}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t pt-3">
        {labelEditorOpen ? (
          <div className="relative mr-auto min-w-40 flex-1 basis-full sm:basis-40">
            <Input
              ref={labelInputRef}
              className="h-7 text-sm md:text-sm"
              value={labelInput}
              onChange={(event) => setLabelInput(event.target.value)}
              onKeyDown={handleLabelInputKeyDown}
              maxLength={MAX_LABEL_NAME_LENGTH}
              placeholder={t("tooltip.labelPlaceholder")}
              aria-label={t("tooltip.labelInputLabel")}
              disabled={busy}
            />
            {creatingLabel ? (
              <LoaderCircle
                className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-expanded="false"
            className="mr-auto text-muted-foreground"
            onClick={openLabelEditor}
          >
            <Plus aria-hidden="true" />
            {t("tooltip.addLabel")}
          </Button>
        )}

        <Popover
          open={suppressionMenuOpen}
          onOpenChange={setSuppressionMenuOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={suppressionMenuOpen ? "secondary" : "ghost"}
              size="icon-sm"
              disabled={busy}
              aria-expanded={suppressionMenuOpen}
              aria-label={t("tooltip.suppression.menuLabel")}
              title={t("tooltip.suppression.menuLabel")}
            >
              {suppressingScope ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <EyeOff aria-hidden="true" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            portalContainer={tooltipRef.current ?? portalContainer}
            align="end"
            className="w-56 gap-1 p-1"
            data-snippet-vault-ui="true"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start font-normal"
              disabled={busy}
              onClick={() => void suppressTooltip("page")}
            >
              {t("tooltip.suppression.pageAction")}
            </Button>
            <div className="mx-1 border-t" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start font-normal"
              disabled={busy || !canSuppressSite}
              title={
                canSuppressSite
                  ? undefined
                  : t("tooltip.suppression.siteUnavailable")
              }
              onClick={() => void suppressTooltip("site")}
            >
              {t("tooltip.suppression.siteAction")}
            </Button>
          </PopoverContent>
        </Popover>

        <Select
          value={contextId ?? ""}
          onValueChange={(value) =>
            setContextId(value === "none" ? undefined : value)
          }
          disabled={busy}
        >
          <SelectTrigger
            size="sm"
            className="max-w-44 shrink-0"
            aria-label={t("tooltip.environmentSelectLabel")}
          >
            <SelectValue placeholder={t("tooltip.environmentPlaceholder")} />
          </SelectTrigger>
          <SelectContent
            portalContainer={tooltipRef.current ?? portalContainer}
            position="popper"
            align="end"
            data-snippet-vault-ui="true"
          >
            <SelectItem value="none">
              <span className="flex min-w-0 items-center gap-2">
                <ContextMarker color="slate" />
                <span className="truncate">
                  {t("tooltip.environmentNone")}
                </span>
              </span>
            </SelectItem>
            {contexts.map((context) => (
              <SelectItem key={context.id} value={context.id}>
                <span className="flex min-w-0 items-center gap-2">
                  <ContextMarker color={context.color} />
                  <span className="truncate">{context.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          disabled={busy || saved}
          aria-busy={saving}
          variant={saved ? "outline" : "default"}
          className={cn(saved && "border-primary/30 text-primary")}
          onClick={() => void saveSelection()}
        >
          {saving ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check
              className={cn("size-3.5", saved && "text-primary")}
              aria-hidden="true"
            />
          )}
          {saved ? t("tooltip.saved") : t("tooltip.save")}
        </Button>
      </div>
    </div>
  );
}

function handleLabelGroupKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  const buttons =
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "button[aria-pressed]",
    );
  if (buttons.length === 0) {
    return;
  }

  const currentIndex = Array.from(buttons).indexOf(
    document.activeElement as HTMLButtonElement,
  );
  const nextIndex =
    event.key === "ArrowRight"
      ? (currentIndex + 1) % buttons.length
      : (currentIndex - 1 + buttons.length) % buttons.length;

  buttons[nextIndex]?.focus();
  event.preventDefault();
}

function findLabelByName(
  labels: readonly LabelSummary[],
  name: string,
  locale: SupportedLocale,
): LabelSummary | undefined {
  const collator = new Intl.Collator(toIntlLocale(locale), {
    sensitivity: "accent",
  });
  return labels.find(
    (label) =>
      collator.compare(
        getLocalizedLabelName(label.id, label.name, locale),
        name,
      ) === 0,
  );
}

function promoteLabels(
  labels: readonly LabelSummary[],
  selectedLabelIds: readonly string[],
): LabelSummary[] {
  const labelById = new Map(labels.map((label) => [label.id, label]));
  const selectedIdSet = new Set(selectedLabelIds);
  return [
    ...selectedLabelIds.flatMap((labelId) => {
      const label = labelById.get(labelId);
      return label ? [label] : [];
    }),
    ...labels.filter((label) => !selectedIdSet.has(label.id)),
  ];
}

function promoteLabel(
  labels: readonly LabelSummary[],
  selected: LabelSummary,
): LabelSummary[] {
  return [selected, ...labels.filter((label) => label.id !== selected.id)];
}

function getVisibleLabels(
  labels: readonly LabelSummary[],
  selectedLabelIds: readonly string[],
  maximum: number,
): LabelSummary[] {
  return promoteLabels(labels, selectedLabelIds).slice(0, maximum);
}

function viewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
