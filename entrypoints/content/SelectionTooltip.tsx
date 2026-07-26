// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
} from "../../lib/browser/message-contract";
import {
  calculateTooltipPosition,
  isEditableTarget,
  isSnippetVaultUiEvent,
  readSelectionSnapshot,
  type SelectionSnapshot,
  type TooltipPosition,
} from "./selection";

const TOOLTIP_MAX_WIDTH = 640;
const VIEWPORT_GUTTER = 24;
const ESTIMATED_TOOLTIP_SIZE = {
  width: 520,
  height: 48,
};
const MAX_VISIBLE_LABELS = 4;

const ENVIRONMENT_OPTIONS = [
  { value: "development", label: "开发", context: "开发环境" },
  { value: "test", label: "测试", context: "测试环境" },
  { value: "staging", label: "预发布", context: "预发布环境" },
  { value: "production", label: "生产", context: "生产环境" },
] as const;

type EnvironmentValue = (typeof ENVIRONMENT_OPTIONS)[number]["value"];

interface SelectionTooltipProps {
  portalContainer: HTMLElement;
}

export function SelectionTooltip({ portalContainer }: SelectionTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const labelsRequestedRef = useRef(false);
  const uiPointerActiveRef = useRef(false);
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState<string>();
  const [labelInput, setLabelInput] = useState("");
  const [environment, setEnvironment] = useState<EnvironmentValue>();
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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

      window.requestAnimationFrame(() => {
        const snapshot = readSelectionSnapshot();
        if (!snapshot) {
          hideTooltip();
          return;
        }

        if (!labelsRequestedRef.current) {
          void loadLabels();
        }
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
    const handleViewportChange = () => hideTooltip();

    document.addEventListener("pointerup", updateSelection, true);
    document.addEventListener("keyup", updateSelection, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerup", updateSelection, true);
      document.removeEventListener("keyup", updateSelection, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      clearHideTimer();
    };
  }, []);

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
  }, [
    creatingLabel,
    environment,
    labels.length,
    labelsLoading,
    saving,
    selectedLabelId,
    selection,
  ]);

  async function loadLabels() {
    labelsRequestedRef.current = true;
    setLabelsLoading(true);
    const response = await sendExtensionMessage<LabelListData>({
      type: MESSAGE_TYPE.getLabels,
    });
    setLabelsLoading(false);

    if (!response.ok) {
      labelsRequestedRef.current = false;
      toast.error("标签加载失败", {
        description: response.error.message,
      });
      return;
    }

    setLabels(response.data.labels);
  }

  async function createAndSelectLabel() {
    if (creatingLabel || labelsLoading || saving) {
      return;
    }

    const name = labelInput.trim();
    if (!name) {
      toast.error("请输入标签名称");
      return;
    }

    const existing = findLabelByName(labels, name);
    if (existing) {
      selectLabel(existing);
      setLabels((current) => promoteLabel(current, existing));
      setLabelInput("");
      toast.success(`已选中「${existing.name}」`);
      return;
    }

    setCreatingLabel(true);
    const response = await sendExtensionMessage<CreateLabelData>({
      type: MESSAGE_TYPE.createLabel,
      payload: { name },
    });
    setCreatingLabel(false);

    if (!response.ok) {
      toast.error("标签保存失败", {
        description: response.error.message,
      });
      return;
    }

    const { label, created } = response.data;
    setLabels((current) => promoteLabel(current, label));
    setSelectedLabelId(label.id);
    setLabelInput("");
    toast.success(
      created ? `已创建并选中「${label.name}」` : `已选中「${label.name}」`,
    );
  }

  function handleLabelInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void createAndSelectLabel();
  }

  function selectLabel(label: LabelSummary) {
    setSelectedLabelId(label.id);
  }

  async function saveSelection() {
    if (!selection || saving || creatingLabel) {
      return;
    }
    if (!selectedLabelId) {
      toast.error("请先选择或输入一个标签");
      return;
    }

    const environmentOption = ENVIRONMENT_OPTIONS.find(
      (option) => option.value === environment,
    );
    setSaving(true);
    const response = await sendExtensionMessage<SaveSelectionData>({
      type: MESSAGE_TYPE.saveSelection,
      payload: {
        content: selection.markdown,
        labelId: selectedLabelId,
        temporary: false,
        ...(environmentOption ? { context: environmentOption.context } : {}),
        ...(document.title ? { sourceTitle: document.title } : {}),
      },
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("保存失败", {
        description: response.error.message,
      });
      return;
    }

    const statusMessages = [
      environmentOption ? `环境：${environmentOption.label}` : null,
      response.data.searchStatus === "rebuild-required"
        ? "搜索索引将在下次启动时重建"
        : null,
      response.data.labelStatus === "stale" ? "标签排序稍后更新" : null,
    ].filter((message): message is string => message !== null);

    toast.success("已保存", {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(" · ") }
        : {}),
    });
    const selectedLabel = labels.find((label) => label.id === selectedLabelId);
    if (selectedLabel) {
      setLabels((current) => promoteLabel(current, selectedLabel));
    }
    window.getSelection()?.removeAllRanges();
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(hideTooltip, 400);
  }

  function resetForm() {
    setSelectedLabelId(undefined);
    setLabelInput("");
    setEnvironment(undefined);
    setCreatingLabel(false);
    setSaving(false);
  }

  function hideTooltip() {
    setSelection(null);
    setPosition(null);
    resetForm();
    clearHideTimer();
  }

  function clearHideTimer() {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  if (!selection || !position) {
    return null;
  }

  const busy = creatingLabel || labelsLoading || saving;
  const visibleLabels = labels.slice(0, MAX_VISIBLE_LABELS);
  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    maxWidth: Math.min(
      TOOLTIP_MAX_WIDTH,
      Math.max(0, window.innerWidth - VIEWPORT_GUTTER),
    ),
  };

  return (
    <div
      ref={tooltipRef}
      data-snippet-vault-ui="true"
      className="pointer-events-auto fixed z-50 w-max rounded-full border bg-popover p-2 font-sans text-popover-foreground shadow-md outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
      style={style}
      role="toolbar"
      aria-label="保存所选文本"
      data-placement={position.placement}
      onPointerDownCapture={() => {
        uiPointerActiveRef.current = true;
      }}
      onPointerCancelCapture={() => {
        uiPointerActiveRef.current = false;
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {labelsLoading ? (
            <LoaderCircle
              className="size-3.5 animate-spin text-muted-foreground"
              aria-label="正在加载标签"
            />
          ) : null}

          {visibleLabels.map((label, index) => (
            <Badge
              key={label.id}
              asChild
              variant={selectedLabelId === label.id ? "default" : "outline"}
              className={
                index >= 2
                  ? "hidden h-6 max-w-24 rounded-md text-sm disabled:pointer-events-none disabled:opacity-50 sm:inline-flex"
                  : "h-6 max-w-24 rounded-md text-sm disabled:pointer-events-none disabled:opacity-50"
              }
            >
              <button
                type="button"
                disabled={busy}
                aria-pressed={selectedLabelId === label.id}
                onClick={() => selectLabel(label)}
              >
                <span className="truncate">{label.name}</span>
              </button>
            </Badge>
          ))}

          <Input
            className="w-24 text-xs md:text-xs"
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            onKeyDown={handleLabelInputKeyDown}
            maxLength={MAX_LABEL_NAME_LENGTH}
            placeholder="+ 标签"
            aria-label="输入标签，按回车创建并选中"
            disabled={busy}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
          <Select
            value={environment ?? ""}
            onValueChange={(value) =>
              setEnvironment(
                value === "none" ? undefined : (value as EnvironmentValue),
              )
            }
            disabled={busy}
          >
            <SelectTrigger aria-label="选择环境；该值作为上下文保存并参与检索">
              <SelectValue placeholder="环境" />
            </SelectTrigger>
            <SelectContent
              portalContainer={portalContainer}
              position="popper"
              align="end"
              data-snippet-vault-ui="true"
            >
              <SelectItem value="none">不指定</SelectItem>
              {ENVIRONMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            size="sm"
            disabled={busy}
            aria-busy={saving}
            onClick={() => void saveSelection()}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

function findLabelByName(
  labels: readonly LabelSummary[],
  name: string,
): LabelSummary | undefined {
  return labels.find(
    (label) =>
      label.name.localeCompare(name, undefined, {
        sensitivity: "accent",
      }) === 0,
  );
}

function promoteLabel(
  labels: readonly LabelSummary[],
  selected: LabelSummary,
): LabelSummary[] {
  return [selected, ...labels.filter((label) => label.id !== selected.id)];
}

function viewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}
