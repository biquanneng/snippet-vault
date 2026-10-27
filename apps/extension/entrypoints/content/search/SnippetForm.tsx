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
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Globe2,
  LoaderCircle,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { FieldError, FieldLabel } from '../../../components/ui/field';
import { Input } from '../../../components/ui/input';
import { Kbd } from '../../../components/ui/kbd';
import { Textarea } from '../../../components/ui/textarea';
import {
  MAX_LABEL_NAME_LENGTH,
  MAX_SELECTION_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type CreateLabelData,
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
  type SearchPanelItem,
  type SearchPanelKind,
  type UpdateSnippetData,
  type UpdateSnippetRequest,
} from '../../../lib/browser/message-contract';
import type { PageSource } from '../../../lib/browser/page-source';
import { toIntlLocale, type SupportedLocale } from '../../../lib/i18n-catalog';
import { getLocalizedLabelName } from '../../../lib/localized-values';
import { detectLabelIds } from '../../../lib/secret-detection';
import { useI18n } from '../../../lib/use-i18n';
import { cn } from '../../../lib/utils';
import { getMutationStatusMessages } from './mutation-status';

const COLLAPSED_LABEL_LIMIT = 6;
const LABEL_DETECTION_DELAY_MS = 250;
const IS_MAC = /mac/i.test(globalThis.navigator?.platform ?? '');

interface SnippetFormProps {
  enhancedCreate?: boolean;
  kind: SearchPanelKind;
  item?: SearchPanelItem;
  portalContainer?: HTMLElement;
  /** Read once when a create form opens; later tab switches do not replace it. */
  getPageSource?: () => Promise<PageSource | null>;
  onCancel: () => void;
  onSaved: (continueCreating?: boolean) => void;
}

type CreateSaveMode = 'close' | 'continue';

export function SnippetForm({
  enhancedCreate = false,
  kind,
  item,
  portalContainer,
  getPageSource,
  onCancel,
  onSaved,
}: SnippetFormProps) {
  const { locale, t } = useI18n();
  const contentId = useId();
  const labelHintId = useId();
  const labelInputId = useId();
  const expiryInputId = useId();
  const expiryHintId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const submissionInFlightRef = useRef(false);
  // Once the user picks labels by hand, detection never overrides them.
  const labelsTouchedRef = useRef(false);
  const editing = item !== undefined;
  const originalExpiryInput =
    item?.kind === 'workspace'
      ? formatDateTimeLocal(item.expiresAt)
      : '';
  const [content, setContent] = useState(item?.content ?? '');
  const [labels, setLabels] = useState<LabelSummary[]>([]);
  const [archivedCurrentLabelIds, setArchivedCurrentLabelIds] =
    useState<Set<string>>(new Set());
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    item?.labels.map((label) => label.id) ?? [],
  );
  const [autoLabelIds, setAutoLabelIds] = useState<string[]>([]);
  const [source, setSource] = useState<PageSource | null>(null);
  const [expiryInput, setExpiryInput] = useState(originalExpiryInput);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [labelsError, setLabelsError] = useState<string | null>(null);
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

    void sendExtensionMessage<LabelListData>({
      type: MESSAGE_TYPE.getLabels,
    }).then((labelResponse) => {
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
    });

    return () => {
      cancelled = true;
    };
  }, [item, labelsRevision, locale]);

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

  useEffect(() => {
    const form = formRef.current;
    const ownerWindow = form?.ownerDocument.defaultView;
    if (!form || !ownerWindow) {
      return;
    }

    // Radix handles Escape on document capture, before React's form handler.
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !event.composedPath().includes(form)) {
        return;
      }
      event.stopPropagation();
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      event.preventDefault();
      if (!saving && !creatingLabel) {
        onCancel();
      }
    };

    ownerWindow.addEventListener('keydown', handleEscape, true);
    return () => ownerWindow.removeEventListener('keydown', handleEscape, true);
  }, [creatingLabel, onCancel, saving]);

  useEffect(() => {
    if (editing || !getPageSource) {
      return;
    }
    let cancelled = false;
    void getPageSource().then((pageSource) => {
      if (!cancelled) {
        setSource(pageSource);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editing, getPageSource]);

  useEffect(() => {
    if (editing || labelsTouchedRef.current || labelsLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (labelsTouchedRef.current) {
        return;
      }
      const availableLabelIds = new Set(labels.map((label) => label.id));
      const detected = detectLabelIds(content).filter((labelId) =>
        availableLabelIds.has(labelId),
      );
      setAutoLabelIds(detected);
      setSelectedLabelIds(detected);
    }, LABEL_DETECTION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [content, editing, labels, labelsLoading]);

  function toggleLabel(labelId: string) {
    labelsTouchedRef.current = true;
    setAutoLabelIds([]);
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
        ...(source ? { source } : {}),
      },
    });

    if (!response.ok) {
      toast.error(t('search.create.saveFailed'), {
        description: response.error.message,
      });
      return false;
    }

    // Success stays silent; only a degraded save is worth interrupting for.
    const statusMessages = getMutationStatusMessages(response.data, t);
    if (statusMessages.length > 0) {
      toast.warning(t('search.create.saved'), {
        description: statusMessages.join(' · '),
      });
    }
    return true;
  }

  async function updateSnippet(
    currentItem: SearchPanelItem,
    expiresAt: number | undefined,
  ): Promise<boolean> {
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

    // Success stays silent; only a degraded save is worth interrupting for.
    const statusMessages = getMutationStatusMessages(response.data, t);
    if (statusMessages.length > 0) {
      toast.warning(t('search.edit.saved'), {
        description: statusMessages.join(' · '),
      });
    }
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
    requestAnimationFrame(() => labelInputRef.current?.focus());
  }

  function handleLabelInputKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key !== 'Enter' ||
      event.metaKey ||
      event.ctrlKey ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }
    event.preventDefault();
    void createOrSelectLabel();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLFormElement>) {
    if (
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      if (!saving && !creatingLabel) {
        onCancel();
      }
      return;
    }
    const submitShortcut =
      event.key === 'Enter' &&
      (IS_MAC
        ? event.metaKey && !event.ctrlKey
        : event.ctrlKey && !event.metaKey) &&
      !event.altKey &&
      !event.shiftKey;
    if (submitShortcut) {
      event.stopPropagation();
      event.preventDefault();
      if (!event.repeat && canSave) {
        void submitForm('close');
      }
    }
  }

  function promoteLabel(label: LabelSummary) {
    labelsTouchedRef.current = true;
    setAutoLabelIds([]);
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
      ref={formRef}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => void handleSubmit(event)}
      onKeyDown={handleKeyDown}
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={saving || creatingLabel}
          aria-label={t('search.create.cancel')}
          title={t('search.create.cancel')}
          onClick={onCancel}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <h2 className="min-w-0 truncate text-base font-medium">
          {t(editing ? 'search.edit.title' : 'search.create.title')}
        </h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-32 flex-1">
          <FieldLabel htmlFor={contentId} className="sr-only">
            {t('search.create.contentLabel')}
          </FieldLabel>
          <Textarea
            ref={contentRef}
            id={contentId}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_SELECTION_LENGTH}
            autoFocus
            disabled={saving}
            placeholder={t('search.create.contentPlaceholder')}
            className="h-full min-h-0 flex-1 resize-none field-sizing-fixed overflow-y-auto overscroll-contain rounded-none border-0 bg-transparent px-5 py-4 font-mono text-[13px] leading-relaxed shadow-none focus-visible:border-0 focus-visible:ring-0 md:text-[13px] dark:bg-transparent"
          />
        </div>

        <div className="flex max-h-1/2 shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain border-t bg-surface px-5 py-3.5">
          {editing && item.source ? (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate" title={item.source.url}>
                {t('search.edit.sourcePreserved', [
                  item.source.title ??
                    item.source.domain ??
                    item.source.url ??
                    '',
                ])}
              </span>
            </p>
          ) : null}
          {!editing && source ? (
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Globe2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate" title={source.url}>
                {t('search.create.sourceFromPage', [formatPageSource(source)])}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={saving}
                aria-label={t('search.create.removeSource')}
                title={t('search.create.removeSource')}
                onClick={() => setSource(null)}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          <fieldset
            className="min-w-0 space-y-2"
            aria-describedby={
              archivedCurrentLabelIds.size > 0 ? labelHintId : undefined
            }
          >
            <legend className="sr-only">
              {t('search.create.labelsLabel')}
            </legend>
            {archivedCurrentLabelIds.size > 0 ? (
              <p id={labelHintId} className="sr-only">
                {t('search.edit.labelsHintWithArchived')}
              </p>
            ) : null}
            {enhancedCreate &&
            !editing &&
            !labelsLoading &&
              !labelsError ? (
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
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
                  className="h-7 min-w-32 flex-1 text-xs md:text-xs"
                  onChange={(event) => setLabelInput(event.target.value)}
                  onKeyDown={handleLabelInputKeyDown}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
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
              className="flex min-h-7 flex-wrap content-start items-center gap-1.5"
            >
              {labelsLoading ? (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
                <span className="text-xs text-muted-foreground">
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
                        variant="outline"
                        className={cn(
                          'h-6 max-w-48 rounded-md text-xs disabled:pointer-events-none disabled:opacity-50',
                          selected
                            ? 'border-transparent bg-brand/10 dark:bg-brand/15'
                            : 'bg-background text-muted-foreground hover:text-foreground',
                        )}
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
                          {selected ? (
                            <Check
                              className="size-3 text-brand-strong"
                              aria-hidden="true"
                            />
                          ) : null}
                          {archivedCurrent ? (
                            <Archive className="size-3" aria-hidden="true" />
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
          </fieldset>

          {item?.kind === 'workspace' ? (
            <div className="flex flex-wrap items-center gap-2">
              <FieldLabel
                htmlFor={expiryInputId}
                className="text-xs text-muted-foreground"
              >
                {t('search.edit.expiryLabel')}
              </FieldLabel>
              <Input
                id={expiryInputId}
                type="datetime-local"
                value={expiryInput}
                min={formatDateTimeLocal(Date.now() + 60_000)}
                step={60}
                disabled={busy}
                aria-describedby={expiryInvalid ? expiryHintId : undefined}
                aria-invalid={expiryInvalid || undefined}
                className="h-7 w-auto min-w-0 max-w-full font-mono text-xs md:text-xs"
                onChange={(event) => setExpiryInput(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <footer className="flex h-11 shrink-0 items-center gap-2 border-t bg-surface px-5">
        <div className="min-w-0 flex-1 text-xs text-muted-foreground" role="status">
          {expiryInvalid ? (
            <FieldError
              id={expiryHintId}
              className="truncate text-xs"
              title={t('search.edit.expiryInvalid')}
            >
              {t('search.edit.expiryInvalid')}
            </FieldError>
          ) : autoLabelIds.length > 0 ? (
            <span
              className="flex min-w-0 items-center gap-1.5"
              title={t('search.create.labelsAutoDetected')}
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {t('search.create.labelsAutoDetected')}
              </span>
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={saving || creatingLabel}
          onClick={onCancel}
        >
          {t('search.create.cancel')}
          <Kbd>esc</Kbd>
        </Button>
        {enhancedCreate && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={!canSave}
            aria-busy={savingAction === 'continue'}
            onClick={() => void submitForm('continue')}
          >
            {savingAction === 'continue' ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : null}
            {savingAction === 'continue'
              ? t('search.create.saving')
              : t('search.create.saveAndContinue')}
          </Button>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          size="xs"
          disabled={!canSave}
          aria-busy={savingAction === 'close'}
          aria-keyshortcuts={IS_MAC ? 'Meta+Enter' : 'Control+Enter'}
        >
          {savingAction === 'close' ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : null}
          {savingAction === 'close'
            ? t(editing ? 'search.edit.saving' : 'search.create.saving')
            : t(editing ? 'search.edit.save' : 'search.create.save')}
          <Kbd>{IS_MAC ? '⌘' : 'Ctrl'}↵</Kbd>
        </Button>
      </footer>
    </form>
  );
}

function formatPageSource(source: PageSource): string {
  const domain = new URL(source.url).hostname;
  return source.title ? `${source.title} · ${domain}` : domain;
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
