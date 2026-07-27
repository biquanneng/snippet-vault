// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  Archive,
  Check,
  FilePlus2,
  Globe2,
  LoaderCircle,
  PencilLine,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../../../components/ui/badge';
import { ContextMarker } from '../../../components/context-marker';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import {
  MAX_SELECTION_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ContextPresetListData,
  type ContextPresetSummary,
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
  type SearchPanelItem,
  type SearchPanelKind,
  type UpdateSnippetContextSelection,
  type UpdateSnippetData,
  type UpdateSnippetRequest,
} from '../../../lib/browser/message-contract';
import { getStoredContextColor } from '../../../lib/context-colors';
import {
  getEnvironmentValue,
  getLocalizedEnvironmentName,
  getLocalizedLabelName,
} from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { getMutationStatusMessages } from './mutation-status';

const NO_CONTEXT_VALUE = '__snippet-vault-no-context__';
const PRESERVE_CONTEXT_VALUE = '__snippet-vault-preserve-context__';

interface SnippetFormProps {
  kind: SearchPanelKind;
  item?: SearchPanelItem;
  portalContainer?: HTMLElement;
  onCancel: () => void;
  onSaved: () => void;
}

export function SnippetForm({
  kind,
  item,
  portalContainer,
  onCancel,
  onSaved,
}: SnippetFormProps) {
  const { locale, t } = useI18n();
  const contentId = useId();
  const labelHintId = useId();
  const contextTriggerId = useId();
  const expiryInputId = useId();
  const expiryHintId = useId();
  const editing = item !== undefined;
  const originalExpiryInput =
    item?.kind === 'workspace'
      ? formatDateTimeLocal(item.expiresAt)
      : '';
  const [content, setContent] = useState(item?.content ?? '');
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [contexts, setContexts] = useState<ContextPresetSummary[]>([]);
  const [archivedCurrentLabelIds, setArchivedCurrentLabelIds] =
    useState<Set<string>>(new Set());
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    item?.labels.map((label) => label.id) ?? [],
  );
  const [contextSelection, setContextSelection] = useState(
    item?.context ? PRESERVE_CONTEXT_VALUE : NO_CONTEXT_VALUE,
  );
  const [expiryInput, setExpiryInput] = useState(originalExpiryInput);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [contextsError, setContextsError] = useState<string | null>(null);
  const [labelsRevision, setLabelsRevision] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLabelsLoading(true);
    setLabelsError(null);
    setContextsError(null);

    void Promise.all([
      sendExtensionMessage<LabelListData>({
        type: MESSAGE_TYPE.getLabels,
      }),
      sendExtensionMessage<ContextPresetListData>({
        type: MESSAGE_TYPE.getContextPresets,
      }),
    ]).then(([labelResponse, contextResponse]) => {
      if (cancelled) {
        return;
      }

      setLabelsLoading(false);
      if (!labelResponse.ok) {
        setLabels([]);
        setArchivedCurrentLabelIds(new Set());
        setLabelsError(labelResponse.error.message);
      } else {
        const activeLabelIds = new Set(
          labelResponse.data.labels.map((label) => label.id),
        );
        const currentArchivedLabels =
          item?.labels.filter((label) => !activeLabelIds.has(label.id)) ?? [];
        const availableLabels = [
          ...labelResponse.data.labels,
          ...currentArchivedLabels,
        ];
        const availableLabelIds = new Set(
          availableLabels.map((label) => label.id),
        );

        setLabels(availableLabels);
        setArchivedCurrentLabelIds(
          new Set(currentArchivedLabels.map((label) => label.id)),
        );
        setSelectedLabelIds((current) =>
          current.filter((labelId) => availableLabelIds.has(labelId)),
        );
      }

      if (!contextResponse.ok) {
        setContexts([]);
        setContextsError(contextResponse.error.message);
        if (!item?.context) {
          setContextSelection(NO_CONTEXT_VALUE);
        }
        return;
      }

      setContexts(contextResponse.data.contextPresets);
      setContextSelection((current) => {
        if (
          current === NO_CONTEXT_VALUE ||
          current === PRESERVE_CONTEXT_VALUE
        ) {
          return current;
        }
        return contextResponse.data.contextPresets.some(
          (context) => context.id === current,
        )
          ? current
          : item?.context
            ? PRESERVE_CONTEXT_VALUE
            : NO_CONTEXT_VALUE;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [item, labelsRevision, locale]);

  const localizedCurrentContext = useMemo(() => {
    if (!item?.context) {
      return undefined;
    }
    const environment = getEnvironmentValue(item.context);
    return environment
      ? getLocalizedEnvironmentName(environment, locale)
      : item.context;
  }, [item?.context, locale]);
  const currentContextColor = item?.context
    ? getStoredContextColor(item.contextColor, item.context)
    : undefined;
  const expiryChanged =
    item?.kind === 'workspace' && expiryInput !== originalExpiryInput;
  const parsedExpiry = expiryChanged
    ? parseDateTimeLocal(expiryInput)
    : undefined;
  const expiryInvalid =
    expiryChanged &&
    (parsedExpiry === undefined || parsedExpiry <= Date.now());
  const labelsRequired = kind === 'vault';
  const labelStateReady =
    (!labelsRequired && selectedLabelIds.length === 0) ||
    (labels.length > 0 && labelsError === null);
  const busy = labelsLoading || saving;
  const canSave =
    content.trim().length > 0 &&
    labelStateReady &&
    (!labelsRequired || selectedLabelIds.length > 0) &&
    !expiryInvalid &&
    !busy;

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((current) => {
      if (current.includes(labelId)) {
        return current.filter((selectedId) => selectedId !== labelId);
      }
      return [...current, labelId];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    if (!content.trim()) {
      toast.error(t('search.create.contentRequired'));
      return;
    }
    if (
      (labelsError || labels.length === 0) &&
      (labelsRequired || selectedLabelIds.length > 0)
    ) {
      toast.error(t('search.create.labelLoadFailed'));
      return;
    }
    if (labelsRequired && selectedLabelIds.length === 0) {
      toast.error(t('search.create.labelRequired'));
      return;
    }

    if (item) {
      const expiryStillInvalid =
        expiryChanged &&
        (parsedExpiry === undefined || parsedExpiry <= Date.now());
      if (expiryStillInvalid) {
        toast.error(t('search.edit.expiryInvalid'));
        return;
      }
      await updateSnippet(item, parsedExpiry);
      return;
    }

    await createSnippet();
  }

  async function createSnippet() {
    setSaving(true);
    const response = await sendExtensionMessage<SaveSelectionData>({
      type: MESSAGE_TYPE.createSnippet,
      payload: {
        kind,
        content,
        labelIds: selectedLabelIds,
        ...(contextSelection !== NO_CONTEXT_VALUE
          ? { contextId: contextSelection }
          : {}),
      },
    });
    setSaving(false);

    if (!response.ok) {
      toast.error(t('search.create.saveFailed'), {
        description: response.error.message,
      });
      return;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.create.saved'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    onSaved();
  }

  async function updateSnippet(
    currentItem: SearchPanelItem,
    expiresAt: number | undefined,
  ) {
    const context = toUpdateContextSelection(contextSelection);
    const request: UpdateSnippetRequest =
      currentItem.kind === 'workspace'
        ? {
            type: MESSAGE_TYPE.updateSnippet,
            payload: {
              kind: 'workspace',
              id: currentItem.id,
              expectedUpdatedAt: currentItem.updatedAt,
              content,
              labelIds: selectedLabelIds,
              context,
              ...(expiresAt !== undefined ? { expiresAt } : {}),
            },
          }
        : {
            type: MESSAGE_TYPE.updateSnippet,
            payload: {
              kind: 'vault',
              id: currentItem.id,
              expectedUpdatedAt: currentItem.updatedAt,
              content,
              labelIds: selectedLabelIds,
              context,
            },
          };

    setSaving(true);
    const response = await sendExtensionMessage<UpdateSnippetData>(request);
    setSaving(false);

    if (!response.ok) {
      const title =
        response.error.code === 'CONFLICT'
          ? t('search.edit.conflict')
          : response.error.code === 'NOT_FOUND'
            ? t('search.edit.notFound')
            : t('search.edit.saveFailed');
      toast.error(title, {
        description:
          response.error.code === 'CONFLICT'
            ? t('search.edit.conflictDescription')
            : response.error.message,
      });
      return;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.edit.saved'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    onSaved();
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <div className="flex items-start gap-3 border-b pb-5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              {editing ? (
                <PencilLine className="size-4" />
              ) : (
                <FilePlus2 className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">
                {t(editing ? 'search.edit.title' : 'search.create.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  editing
                    ? kind === 'vault'
                      ? 'search.edit.vaultDescription'
                      : 'search.edit.workspaceDescription'
                    : kind === 'vault'
                      ? 'search.create.vaultDescription'
                      : 'search.create.workspaceDescription',
                )}
              </p>
              {editing && item.source ? (
                <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {t('search.edit.sourcePreserved', [
                      item.source.title ??
                        item.source.domain ??
                        item.source.url ??
                        '',
                    ])}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={contentId}
              className="text-sm font-medium text-foreground"
            >
              {t('search.create.contentLabel')}
            </label>
            <Textarea
              id={contentId}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={MAX_SELECTION_LENGTH}
              rows={8}
              autoFocus
              disabled={saving}
              placeholder={t('search.create.contentPlaceholder')}
              className="min-h-40 resize-y font-mono"
            />
          </div>

          <fieldset
            className="space-y-2"
            aria-describedby={labelHintId}
          >
            <legend className="text-sm font-medium text-foreground">
              {t('search.create.labelsLabel')}
            </legend>
            <p
              id={labelHintId}
              className="text-xs text-muted-foreground"
            >
              {t(
                archivedCurrentLabelIds.size > 0
                  ? 'search.edit.labelsHintWithArchived'
                  : kind === 'workspace'
                    ? 'search.create.workspaceLabelsHint'
                    : 'search.create.labelsHint',
              )}
            </p>
            <div
              className="flex min-h-16 flex-wrap content-start gap-2 rounded-lg border bg-muted/20 p-3"
            >
              {labelsLoading ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t('search.create.loadingLabels')}
                </span>
              ) : null}

              {!labelsLoading && labelsError ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-destructive">
                      {t('search.create.labelLoadFailed')}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {labelsError}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLabelsRevision((current) => current + 1)
                    }
                  >
                    <RotateCcw aria-hidden="true" />
                    {t('search.create.retry')}
                  </Button>
                </div>
              ) : null}

              {!labelsLoading && !labelsError && labels.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  {t('search.create.noLabels')}
                </span>
              ) : null}

              {!labelsLoading && !labelsError
                ? labels.map((label) => {
                    const selected = selectedLabelIds.includes(label.id);
                    const archivedCurrent =
                      archivedCurrentLabelIds.has(label.id);
                    const localizedName = getLocalizedLabelName(
                      label.id,
                      label.name,
                      locale,
                    );
                    return (
                      <Badge
                        key={label.id}
                        asChild
                        variant={selected ? 'default' : 'outline'}
                        className="h-7 max-w-48 rounded-md text-sm disabled:pointer-events-none disabled:opacity-50"
                      >
                        <button
                          type="button"
                          disabled={saving}
                          aria-pressed={selected}
                          title={
                            archivedCurrent
                              ? t('search.edit.archivedLabel', [localizedName])
                              : localizedName
                          }
                          onClick={() => toggleLabel(label.id)}
                        >
                          {archivedCurrent ? (
                            <Archive className="size-3" aria-hidden="true" />
                          ) : selected ? (
                            <Check className="size-3" aria-hidden="true" />
                          ) : null}
                          <span className="truncate">{localizedName}</span>
                        </button>
                      </Badge>
                    );
                  })
                : null}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label
              htmlFor={contextTriggerId}
              className="text-sm font-medium text-foreground"
            >
              {t('search.create.environmentLabel')}
            </label>
            <Select
              value={contextSelection}
              onValueChange={setContextSelection}
              disabled={saving}
            >
              <SelectTrigger
                id={contextTriggerId}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                portalContainer={portalContainer}
                position="popper"
                align="start"
                data-snippet-vault-ui="true"
              >
                {localizedCurrentContext ? (
                  <SelectItem value={PRESERVE_CONTEXT_VALUE}>
                    <span className="flex min-w-0 items-center gap-2">
                      {currentContextColor ? (
                        <ContextMarker color={currentContextColor} />
                      ) : null}
                      <span className="truncate">
                        {t('search.edit.keepCurrentContext', [
                          localizedCurrentContext,
                        ])}
                      </span>
                    </span>
                  </SelectItem>
                ) : null}
                <SelectItem value={NO_CONTEXT_VALUE}>
                  {t('search.create.environmentNone')}
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
            {contextsError ? (
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 break-words text-xs text-destructive">
                  {t('search.create.contextLoadFailed')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={saving}
                  onClick={() =>
                    setLabelsRevision((current) => current + 1)
                  }
                >
                  <RotateCcw aria-hidden="true" />
                  {t('search.create.retry')}
                </Button>
              </div>
            ) : null}
          </div>

          {item?.kind === 'workspace' ? (
            <div className="space-y-2">
              <label
                htmlFor={expiryInputId}
                className="text-sm font-medium text-foreground"
              >
                {t('search.edit.expiryLabel')}
              </label>
              <Input
                id={expiryInputId}
                type="datetime-local"
                value={expiryInput}
                min={formatDateTimeLocal(Date.now() + 60_000)}
                step={60}
                disabled={saving}
                aria-describedby={expiryHintId}
                aria-invalid={expiryInvalid || undefined}
                className="font-mono"
                onChange={(event) => setExpiryInput(event.target.value)}
              />
              <p
                id={expiryHintId}
                className={
                  expiryInvalid
                    ? 'text-xs text-destructive'
                    : 'text-xs text-muted-foreground'
                }
              >
                {t(
                  expiryInvalid
                    ? 'search.edit.expiryInvalid'
                    : 'search.edit.expiryHint',
                )}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-background px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={onCancel}
        >
          {t('search.create.cancel')}
        </Button>
        <Button type="submit" disabled={!canSave} aria-busy={saving}>
          {saving ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {saving
            ? t(editing ? 'search.edit.saving' : 'search.create.saving')
            : t(editing ? 'search.edit.save' : 'search.create.save')}
        </Button>
      </div>
    </form>
  );
}

function toUpdateContextSelection(
  value: string,
): UpdateSnippetContextSelection {
  if (value === PRESERVE_CONTEXT_VALUE) {
    return { mode: 'preserve' };
  }
  if (value === NO_CONTEXT_VALUE) {
    return { mode: 'clear' };
  }
  return { mode: 'set', contextId: value };
}

function formatDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
    'T',
    padDatePart(date.getHours()),
    ':',
    padDatePart(date.getMinutes()),
  ].join('');
}

function parseDateTimeLocal(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}
