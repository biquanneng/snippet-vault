// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Globe2,
  LoaderCircle,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../../../components/ui/badge';
import { ContextMarker } from '../../../components/context-marker';
import { Button } from '../../../components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../../../components/ui/field';
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
  MAX_LABEL_NAME_LENGTH,
  MAX_SELECTION_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ContextPresetListData,
  type ContextPresetSummary,
  type CreateLabelData,
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
  type SearchPanelItem,
  type SearchPanelKind,
  type UpdateSnippetContextSelection,
  type UpdateSnippetData,
  type UpdateSnippetRequest,
} from '../../../lib/browser/message-contract';
import { toIntlLocale, type SupportedLocale } from '../../../lib/i18n-catalog';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { getMutationStatusMessages } from './mutation-status';

const NO_CONTEXT_VALUE = '__snippet-vault-no-context__';
const PRESERVE_CONTEXT_VALUE = '__snippet-vault-preserve-context__';
const COLLAPSED_LABEL_LIMIT = 6;

interface SnippetFormProps {
  enhancedCreate?: boolean;
  kind: SearchPanelKind;
  item?: SearchPanelItem;
  portalContainer?: HTMLElement;
  onCancel: () => void;
  onSaved: (continueCreating?: boolean) => void;
}

type CreateSaveMode = 'close' | 'continue';

export function SnippetForm({
  enhancedCreate = false,
  kind,
  item,
  portalContainer,
  onCancel,
  onSaved,
}: SnippetFormProps) {
  const { locale, t } = useI18n();
  const contentId = useId();
  const labelHintId = useId();
  const labelInputId = useId();
  const contextTriggerId = useId();
  const expiryInputId = useId();
  const expiryHintId = useId();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
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
  const [labelInput, setLabelInput] = useState('');
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const [savingAction, setSavingAction] =
    useState<CreateSaveMode | null>(null);

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

  const localizedCurrentContext = item?.context?.name;
  const currentContextColor = item?.context?.color;
  const expiryChanged =
    item?.kind === 'workspace' && expiryInput !== originalExpiryInput;
  const parsedExpiry = expiryChanged
    ? parseDateTimeLocal(expiryInput)
    : undefined;
  const expiryInvalid =
    expiryChanged &&
    (parsedExpiry === undefined || parsedExpiry <= Date.now());
  const labelStateReady =
    selectedLabelIds.length === 0 ||
    (labels.length > 0 && labelsError === null);
  const saving = savingAction !== null;
  const busy = labelsLoading || creatingLabel || saving;
  const canSave =
    content.trim().length > 0 &&
    labelStateReady &&
    !expiryInvalid &&
    !busy;
  const collapsedLabels = getVisibleLabels(
    labels,
    selectedLabelIds,
    COLLAPSED_LABEL_LIMIT,
  );
  const displayedLabels = labelsExpanded ? labels : collapsedLabels;
  const hiddenLabelCount = Math.max(
    0,
    labels.length - collapsedLabels.length,
  );

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
    await submitForm('close');
  }

  async function submitForm(saveMode: CreateSaveMode) {
    if (submissionInFlightRef.current || creatingLabel) {
      return;
    }
    if (!content.trim()) {
      toast.error(t('search.create.contentRequired'));
      return;
    }
    if (
      (labelsError || labels.length === 0) &&
      selectedLabelIds.length > 0
    ) {
      toast.error(t('search.create.labelLoadFailed'));
      return;
    }

    let saved = false;
    submissionInFlightRef.current = true;
    setSavingAction(saveMode);
    if (item) {
      const expiryStillInvalid =
        expiryChanged &&
        (parsedExpiry === undefined || parsedExpiry <= Date.now());
      if (expiryStillInvalid) {
        toast.error(t('search.edit.expiryInvalid'));
        submissionInFlightRef.current = false;
        setSavingAction(null);
        return;
      }
      saved = await updateSnippet(item, parsedExpiry);
    } else {
      saved = await createSnippet();
    }
    submissionInFlightRef.current = false;
    setSavingAction(null);

    if (!saved) {
      return;
    }
    if (!item && saveMode === 'continue') {
      setContent('');
      setLabelInput('');
      onSaved(true);
      requestAnimationFrame(() => contentRef.current?.focus());
      return;
    }
    onSaved();
  }

  async function createSnippet(): Promise<boolean> {
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

    if (!response.ok) {
      toast.error(t('search.create.saveFailed'), {
        description: response.error.message,
      });
      return false;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.create.saved'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    return true;
  }

  async function updateSnippet(
    currentItem: SearchPanelItem,
    expiresAt: number | undefined,
  ): Promise<boolean> {
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

    const response = await sendExtensionMessage<UpdateSnippetData>(request);

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
      return false;
    }

    const statusMessages = getMutationStatusMessages(response.data, t);
    toast.success(t('search.edit.saved'), {
      ...(statusMessages.length > 0
        ? { description: statusMessages.join(' · ') }
        : {}),
    });
    return true;
  }

  async function createOrSelectLabel() {
    if (!enhancedCreate || editing || busy) {
      return;
    }
    const name = labelInput.trim();
    if (!name) {
      toast.error(t('search.create.labelRequired'));
      labelInputRef.current?.focus();
      return;
    }

    const existing = findLabelByName(labels, name, locale);
    if (existing) {
      promoteLabel(existing);
      setLabelInput('');
      toast.success(t('search.create.labelSelected', [
        getLocalizedLabelName(existing.id, existing.name, locale),
      ]));
      requestAnimationFrame(() => labelInputRef.current?.focus());
      return;
    }

    setCreatingLabel(true);
    const response = await sendExtensionMessage<CreateLabelData>({
      type: MESSAGE_TYPE.createLabel,
      payload: { name },
    });
    setCreatingLabel(false);

    if (!response.ok) {
      toast.error(t('search.create.labelSaveFailed'), {
        description: response.error.message,
      });
      return;
    }

    promoteLabel(response.data.label);
    setLabelInput('');
    toast.success(
      t(
        response.data.created
          ? 'search.create.labelCreatedSelected'
          : 'search.create.labelSelected',
        [
          getLocalizedLabelName(
            response.data.label.id,
            response.data.label.name,
            locale,
          ),
        ],
      ),
    );
    requestAnimationFrame(() => labelInputRef.current?.focus());
  }

  function handleLabelInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    void createOrSelectLabel();
  }

  function promoteLabel(label: LabelSummary) {
    setLabels((current) => [
      label,
      ...current.filter((candidate) => candidate.id !== label.id),
    ]);
    setSelectedLabelIds((current) =>
      current.includes(label.id) ? current : [...current, label.id],
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <FieldGroup
          className={cn(
            'w-full',
            !enhancedCreate && 'mx-auto max-w-2xl',
          )}
        >
          <div className="pb-1">
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

          <Field>
            <FieldLabel htmlFor={contentId}>
              {t('search.create.contentLabel')}
            </FieldLabel>
            <Textarea
              ref={contentRef}
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
          </Field>

          <FieldSet
            className="gap-3"
            aria-describedby={labelHintId}
          >
            <FieldLegend variant="label">
              {t('search.create.labelsLabel')}
            </FieldLegend>
            <FieldDescription id={labelHintId}>
              {t(
                archivedCurrentLabelIds.size > 0
                  ? 'search.edit.labelsHintWithArchived'
                  : kind === 'workspace'
                    ? 'search.create.workspaceLabelsHint'
                    : 'search.create.labelsHint',
              )}
            </FieldDescription>
            {enhancedCreate &&
            !editing &&
            !labelsLoading &&
              !labelsError ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FieldLabel htmlFor={labelInputId} className="sr-only">
                  {t('search.create.labelInputLabel')}
                </FieldLabel>
                <Input
                  ref={labelInputRef}
                  id={labelInputId}
                  value={labelInput}
                  maxLength={MAX_LABEL_NAME_LENGTH}
                  disabled={busy}
                  placeholder={t('search.create.labelPlaceholder')}
                  className="min-w-40 flex-1"
                  onChange={(event) => setLabelInput(event.target.value)}
                  onKeyDown={handleLabelInputKeyDown}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  aria-busy={creatingLabel}
                  onClick={() => void createOrSelectLabel()}
                >
                  {creatingLabel ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus aria-hidden="true" />
                  )}
                  {t('search.create.addLabel')}
                </Button>
              </div>
            ) : null}
            <div
              className="flex min-h-8 flex-wrap content-start items-center gap-2"
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
                    <FieldError>
                      {t('search.create.labelLoadFailed')}
                    </FieldError>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {labelsError}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
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
                ? displayedLabels.map((label) => {
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
                        variant={selected ? 'default' : 'secondary'}
                        className="h-7 max-w-48 rounded-md text-sm disabled:pointer-events-none disabled:opacity-50"
                      >
                        <button
                          type="button"
                          disabled={busy}
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

              {!labelsLoading &&
              !labelsError &&
              hiddenLabelCount > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-expanded={labelsExpanded}
                  onClick={() => setLabelsExpanded((current) => !current)}
                  className="text-muted-foreground"
                >
                  {labelsExpanded ? (
                    <ChevronUp aria-hidden="true" />
                  ) : (
                    <ChevronDown aria-hidden="true" />
                  )}
                  {t(
                    labelsExpanded
                      ? 'search.create.collapseLabels'
                      : 'search.create.expandLabels',
                    labelsExpanded ? undefined : [hiddenLabelCount],
                  )}
                </Button>
              ) : null}
            </div>
          </FieldSet>

          <Field data-invalid={contextsError ? true : undefined}>
            <FieldLabel htmlFor={contextTriggerId}>
              {t('search.create.environmentLabel')}
            </FieldLabel>
            <Select
              value={contextSelection}
              onValueChange={setContextSelection}
              disabled={busy}
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
                  <span className="flex min-w-0 items-center gap-2">
                    <ContextMarker color="slate" />
                    <span className="truncate">
                      {t('search.create.environmentNone')}
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
            {contextsError ? (
              <div className="flex items-center justify-between gap-3">
                <FieldError className="min-w-0 break-words">
                  {t('search.create.contextLoadFailed')}
                </FieldError>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  disabled={busy}
                  onClick={() =>
                    setLabelsRevision((current) => current + 1)
                  }
                >
                  <RotateCcw aria-hidden="true" />
                  {t('search.create.retry')}
                </Button>
              </div>
            ) : null}
          </Field>

          {item?.kind === 'workspace' ? (
            <Field data-invalid={expiryInvalid || undefined}>
              <FieldLabel htmlFor={expiryInputId}>
                {t('search.edit.expiryLabel')}
              </FieldLabel>
              <Input
                id={expiryInputId}
                type="datetime-local"
                value={expiryInput}
                min={formatDateTimeLocal(Date.now() + 60_000)}
                step={60}
                disabled={busy}
                aria-describedby={expiryHintId}
                aria-invalid={expiryInvalid || undefined}
                className="font-mono"
                onChange={(event) => setExpiryInput(event.target.value)}
              />
              {expiryInvalid ? (
                <FieldError id={expiryHintId}>
                  {t('search.edit.expiryInvalid')}
                </FieldError>
              ) : (
                <FieldDescription id={expiryHintId}>
                  {t('search.edit.expiryHint')}
                </FieldDescription>
              )}
            </Field>
          ) : null}
        </FieldGroup>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 bg-muted/30 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          disabled={saving || creatingLabel}
          onClick={onCancel}
        >
          {t('search.create.cancel')}
        </Button>
        {enhancedCreate && !editing ? (
          <Button
            type="button"
            variant="secondary"
            disabled={!canSave}
            aria-busy={savingAction === 'continue'}
            onClick={() => void submitForm('continue')}
          >
            {savingAction === 'continue' ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {savingAction === 'continue'
              ? t('search.create.saving')
              : t('search.create.saveAndContinue')}
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={!canSave}
          aria-busy={savingAction === 'close'}
        >
          {savingAction === 'close' ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {savingAction === 'close'
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

function getVisibleLabels(
  labels: readonly LabelSummary[],
  selectedLabelIds: readonly string[],
  maximum: number,
): LabelSummary[] {
  const selectedIdSet = new Set(selectedLabelIds);
  const selected = labels.filter((label) => selectedIdSet.has(label.id));
  const remainingSlots = Math.max(0, maximum - selected.length);
  return [
    ...selected,
    ...labels
      .filter((label) => !selectedIdSet.has(label.id))
      .slice(0, remainingSlots),
  ];
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

function findLabelByName(
  labels: LabelSummary[],
  name: string,
  locale: SupportedLocale,
): LabelSummary | undefined {
  const collator = new Intl.Collator(toIntlLocale(locale), {
    sensitivity: 'base',
    usage: 'search',
  });
  return labels.find(
    (label) =>
      collator.compare(label.name, name) === 0 ||
      collator.compare(
        getLocalizedLabelName(label.id, label.name, locale),
        name,
      ) === 0,
  );
}
