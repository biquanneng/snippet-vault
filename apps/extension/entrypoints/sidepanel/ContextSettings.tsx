// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  LoaderCircle,
  Palette,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  ContextColorPicker,
  ContextMarker,
} from '../../components/context-marker';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '../../components/ui/field';
import { Input } from '../../components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import {
  MAX_CONTEXT_PRESET_NAME_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type ContextPresetManagementEntry,
  type ContextPresetManagementListData,
  type CreateContextPresetData,
  type MutationStatusData,
} from '../../lib/browser/message-contract';
import { DEFAULT_CONTEXT_COLOR } from '../../lib/context-colors';
import type { ContextColor } from '../../lib/core/model';
import type { TranslationKey } from '../../lib/i18n-catalog';
import { useI18n } from '../../lib/use-i18n';
import { SettingsBlock } from './SettingsBlock';

const CONTEXT_COLOR_KEYS = {
  slate: 'settings.workspace.colors.slate',
  blue: 'settings.workspace.colors.blue',
  cyan: 'settings.workspace.colors.cyan',
  green: 'settings.workspace.colors.green',
  amber: 'settings.workspace.colors.amber',
  orange: 'settings.workspace.colors.orange',
  red: 'settings.workspace.colors.red',
  purple: 'settings.workspace.colors.purple',
} as const satisfies Record<ContextColor, TranslationKey>;

interface EditingContext {
  id: string;
  name: string;
  color: ContextColor;
}

interface IconActionButtonProps {
  label: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}

function IconActionButton({
  label,
  children,
  disabled = false,
  onClick,
}: IconActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={label}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ContextSettings() {
  const { locale, t } = useI18n();
  const nameInputId = useId();
  const editNameInputId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [contexts, setContexts] = useState<
    ContextPresetManagementEntry[]
  >([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<ContextColor>(DEFAULT_CONTEXT_COLOR);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingContext | null>(null);

  async function loadContexts() {
    setLoading(true);
    setLoadError(null);
    const response =
      await sendExtensionMessage<ContextPresetManagementListData>({
        type: MESSAGE_TYPE.getContextPresetManagement,
      });

    if (!response.ok) {
      setLoadError(response.error.message);
      setLoading(false);
      return;
    }

    setContexts(response.data.contextPresets);
    setLoading(false);
  }

  useEffect(() => {
    void loadContexts();
  }, [locale]);

  function getColorLabel(value: ContextColor): string {
    return t(CONTEXT_COLOR_KEYS[value]);
  }

  async function createContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || creating) {
      return;
    }

    setCreating(true);
    const response = await sendExtensionMessage<CreateContextPresetData>({
      type: MESSAGE_TYPE.createContextPreset,
      payload: {
        name: normalizedName,
        color,
      },
    });
    setCreating(false);

    if (!response.ok) {
      toast.error(t('settings.workspace.createContextFailed'), {
        description: response.error.message,
      });
      return;
    }

    setName('');
    setColor(DEFAULT_CONTEXT_COLOR);
    nameInputRef.current?.focus();
    toast.success(
      response.data.restored
        ? t('settings.workspace.contextRestored')
        : response.data.created
          ? t('settings.workspace.contextCreated')
          : t('settings.workspace.contextExists'),
    );
    await loadContexts();
  }

  async function updateContext() {
    if (!editing || mutatingId) {
      return;
    }
    const normalizedName = editing.name.trim();
    if (!normalizedName) {
      return;
    }

    setMutatingId(editing.id);
    const response = await sendExtensionMessage<MutationStatusData>({
      type: MESSAGE_TYPE.renameContextPreset,
      payload: {
        id: editing.id,
        name: normalizedName,
        color: editing.color,
      },
    });
    setMutatingId(null);

    if (!response.ok) {
      toast.error(t('settings.workspace.updateContextFailed'), {
        description: response.error.message,
      });
      return;
    }

    setEditing(null);
    toast.success(t('settings.workspace.contextUpdated'));
    await loadContexts();
  }

  async function setArchived(option: ContextPresetManagementEntry) {
    if (mutatingId) {
      return;
    }

    const restore = option.archivedAt !== undefined;
    setMutatingId(option.id);
    const response = await sendExtensionMessage<MutationStatusData>({
      type: restore
        ? MESSAGE_TYPE.restoreContextPreset
        : MESSAGE_TYPE.archiveContextPreset,
      payload: { id: option.id },
    });
    setMutatingId(null);

    if (!response.ok) {
      toast.error(t('settings.workspace.contextVisibilityFailed'), {
        description: response.error.message,
      });
      return;
    }

    if (editing?.id === option.id) {
      setEditing(null);
    }
    toast.success(
      restore
        ? t('settings.workspace.contextRestored')
        : t('settings.workspace.contextArchived'),
    );
    await loadContexts();
  }

  return (
    <SettingsBlock
      icon={Palette}
      title={t('settings.workspace.contextTitle')}
      description={t('settings.workspace.contextDescription')}
    >
      <TooltipProvider>
        <div className="space-y-4">
        {/* ── List: primary content ── */}
        {loading && contexts.length === 0 ? (
          <div
            className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
            role="status"
          >
            <LoaderCircle
              className="size-4 animate-spin"
              aria-hidden="true"
            />
            {t('settings.workspace.contextLoading')}
          </div>
        ) : null}

        {loadError ? (
          <div className="space-y-3 rounded-lg bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive" role="alert">
              {t('settings.workspace.contextLoadFailed')}
            </p>
            <p className="break-words text-xs leading-5 text-muted-foreground">
              {loadError}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void loadContexts()}
            >
              <RotateCcw aria-hidden="true" />
              {t('settings.workspace.retry')}
            </Button>
          </div>
        ) : null}

        {!loading && !loadError && contexts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <LayoutGrid className="size-6 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {t('settings.workspace.noContexts')}
            </p>
          </div>
        ) : null}

        {!loadError && contexts.length > 0 ? (
          <div className="space-y-1">
            {contexts.map((context) => {
              const archived = context.archivedAt !== undefined;
              const isEditing = editing?.id === context.id;
              const isMutating = mutatingId === context.id;

              return (
                <div
                  key={context.id}
                  className="rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {isEditing && editing ? (
                    <div className="flex items-start gap-2">
                      <ContextMarker color={editing.color} size="md" />
                      <FieldGroup className="min-w-0 flex-1 gap-3">
                        <Field>
                          <FieldLabel
                            htmlFor={editNameInputId}
                            className="sr-only"
                          >
                            {t('settings.workspace.renameContext')}
                          </FieldLabel>
                          <Input
                            id={editNameInputId}
                            value={editing.name}
                            maxLength={MAX_CONTEXT_PRESET_NAME_LENGTH}
                            autoFocus
                            disabled={isMutating}
                            aria-label={t('settings.workspace.renameContext')}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                name: event.target.value,
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                setEditing(null);
                              } else if (event.key === 'Enter') {
                                event.preventDefault();
                                void updateContext();
                              }
                            }}
                          />
                        </Field>
                        <Field>
                          <FieldTitle className="sr-only">
                            {t('settings.workspace.contextColor')}
                          </FieldTitle>
                          <ContextColorPicker
                            value={editing.color}
                            label={t('settings.workspace.contextColor')}
                            disabled={isMutating}
                            getColorLabel={getColorLabel}
                            onValueChange={(nextColor) =>
                              setEditing({
                                ...editing,
                                color: nextColor,
                              })
                            }
                          />
                        </Field>
                      </FieldGroup>
                      <div className="flex shrink-0 items-center gap-1 pt-0.5">
                        <IconActionButton
                          label={t('settings.workspace.saveContext')}
                          disabled={!editing.name.trim() || isMutating}
                          onClick={() => void updateContext()}
                        >
                          {isMutating ? (
                            <LoaderCircle
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Check aria-hidden="true" />
                          )}
                        </IconActionButton>
                        <IconActionButton
                          label={t('settings.workspace.cancelContext')}
                          disabled={isMutating}
                          onClick={() => setEditing(null)}
                        >
                          <X aria-hidden="true" />
                        </IconActionButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <ContextMarker color={context.color} size="md" />
                      <div
                        className={
                          archived
                            ? 'min-w-0 flex-1 opacity-60'
                            : 'min-w-0 flex-1'
                        }
                      >
                        <p
                          className="truncate text-sm"
                          title={context.name}
                        >
                          {context.name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {context.builtIn ? (
                            <Badge
                              variant="secondary"
                              className="rounded-md font-normal"
                            >
                              {t('settings.workspace.builtInContext')}
                            </Badge>
                          ) : null}
                          {archived ? (
                            <Badge
                              variant="secondary"
                              className="rounded-md font-normal"
                            >
                              {t('settings.workspace.hiddenContext')}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!context.builtIn && !archived ? (
                          <IconActionButton
                            label={t('settings.workspace.renameContext')}
                            disabled={mutatingId !== null}
                            onClick={() =>
                              setEditing({
                                id: context.id,
                                name: context.name,
                                color: context.color,
                              })
                            }
                          >
                            <Pencil aria-hidden="true" />
                          </IconActionButton>
                        ) : null}
                        <IconActionButton
                          label={t(
                            archived
                              ? 'settings.workspace.restoreContext'
                              : 'settings.workspace.hideContext',
                          )}
                          disabled={mutatingId !== null}
                          onClick={() => void setArchived(context)}
                        >
                          {isMutating ? (
                            <LoaderCircle
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : archived ? (
                            <Eye aria-hidden="true" />
                          ) : (
                            <EyeOff aria-hidden="true" />
                          )}
                        </IconActionButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ── Create form: secondary action ── */}
        <form
          className="rounded-lg bg-muted/30 p-3"
          onSubmit={(event) => void createContext(event)}
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor={nameInputId}>
                {t('settings.workspace.contextName')}
              </FieldLabel>
              <Input
                id={nameInputId}
                ref={nameInputRef}
                value={name}
                maxLength={MAX_CONTEXT_PRESET_NAME_LENGTH}
                disabled={creating}
                placeholder={t('settings.workspace.contextPlaceholder')}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldTitle>{t('settings.workspace.contextColor')}</FieldTitle>
              <ContextColorPicker
                value={color}
                label={t('settings.workspace.contextColor')}
                disabled={creating}
                getColorLabel={getColorLabel}
                onValueChange={setColor}
              />
            </Field>
            <Button
              type="submit"
              size="sm"
              className="self-start"
              disabled={!name.trim() || creating}
            >
              {creating ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : null}
              {t('settings.workspace.addContext')}
            </Button>
          </FieldGroup>
        </form>

        {/* ── Footnote ── */}
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.workspace.contextSnapshotNotice')}
          </p>
        </div>
      </TooltipProvider>
    </SettingsBlock>
  );
}
