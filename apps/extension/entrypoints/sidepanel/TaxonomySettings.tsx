// SPDX-License-Identifier: MPL-2.0

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Tags,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  MAX_LABEL_NAME_LENGTH,
  MESSAGE_TYPE,
  sendExtensionMessage,
  type CreateLabelData,
  type LabelManagementEntry,
  type LabelManagementListData,
  type MutationStatusData,
} from "../../lib/browser/message-contract";
import { useI18n } from "../../lib/use-i18n";

interface EditingLabel {
  id: string;
  value: string;
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
            onClick={onClick}
            aria-label={label}
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

export function TaxonomySettings() {
  const { locale, t } = useI18n();
  const inputId = useId();
  const editInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [labels, setLabels] = useState<LabelManagementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingLabel | null>(null);

  async function loadLabels() {
    setLoading(true);
    setLoadError(null);
    const response = await sendExtensionMessage<LabelManagementListData>({
      type: MESSAGE_TYPE.getLabelManagement,
    });

    if (!response.ok) {
      setLoadError(response.error.message);
      setLoading(false);
      return;
    }

    setLabels(response.data.labels);
    setLoading(false);
  }

  useEffect(() => {
    void loadLabels();
  }, [locale]);

  async function createLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = input.trim();
    if (!name || creating) {
      return;
    }

    setCreating(true);
    const response = await sendExtensionMessage<CreateLabelData>({
      type: MESSAGE_TYPE.createLabel,
      payload: { name },
    });
    setCreating(false);

    if (!response.ok) {
      toast.error(t("settings.taxonomy.createLabelFailed"), {
        description: response.error.message,
      });
      return;
    }

    setInput("");
    inputRef.current?.focus();
    toast.success(
      response.data.restored
        ? t("settings.taxonomy.labelRestored")
        : response.data.created
          ? t("settings.taxonomy.labelCreated")
          : t("settings.taxonomy.labelExists"),
    );
    await loadLabels();
  }

  async function renameLabel() {
    if (!editing || mutatingId) {
      return;
    }
    const name = editing.value.trim();
    if (!name) {
      return;
    }

    setMutatingId(editing.id);
    const response = await sendExtensionMessage<MutationStatusData>({
      type: MESSAGE_TYPE.renameLabel,
      payload: { id: editing.id, name },
    });
    setMutatingId(null);

    if (!response.ok) {
      toast.error(t("settings.taxonomy.renameFailed"), {
        description: response.error.message,
      });
      return;
    }

    setEditing(null);
    toast.success(t("settings.taxonomy.renamed"));
    await loadLabels();
  }

  async function setArchived(label: LabelManagementEntry) {
    if (mutatingId) {
      return;
    }

    const restore = label.archivedAt !== undefined;
    setMutatingId(label.id);
    const response = await sendExtensionMessage<MutationStatusData>({
      type: restore ? MESSAGE_TYPE.restoreLabel : MESSAGE_TYPE.archiveLabel,
      payload: { id: label.id },
    });
    setMutatingId(null);

    if (!response.ok) {
      toast.error(t("settings.taxonomy.visibilityFailed"), {
        description: response.error.message,
      });
      return;
    }

    if (editing?.id === label.id) {
      setEditing(null);
    }
    toast.success(
      restore
        ? t("settings.taxonomy.restored")
        : t("settings.taxonomy.archived"),
    );
    await loadLabels();
  }

  if (loading && labels.length === 0) {
    return (
      <div
        className="flex min-h-64 items-center justify-center gap-2 px-4 text-sm text-muted-foreground"
        role="status"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {t("settings.taxonomy.loading")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 px-4 py-6">
        <p className="text-sm font-medium text-destructive" role="alert">
          {t("settings.taxonomy.loadFailed")}
        </p>
        <p className="wrap-break-word text-xs leading-5 text-muted-foreground">
          {loadError}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void loadLabels()}
        >
          <RotateCcw aria-hidden="true" />
          {t("settings.taxonomy.retry")}
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 px-4 py-5 pb-8">
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
          {t("settings.taxonomy.archiveNotice")}
        </p>

        <form onSubmit={(event) => void createLabel(event)}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor={inputId}>
                {t("settings.taxonomy.labelName")}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  id={inputId}
                  ref={inputRef}
                  value={input}
                  maxLength={MAX_LABEL_NAME_LENGTH}
                  disabled={creating}
                  placeholder={t("settings.taxonomy.labelPlaceholder")}
                  onChange={(event) => setInput(event.target.value)}
                  className="min-w-0 flex-1 basis-36"
                />
                <Button type="submit" disabled={!input.trim() || creating}>
                  {creating ? (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {t("settings.taxonomy.addLabel")}
                </Button>
              </div>
            </Field>
          </FieldGroup>
        </form>

        {labels.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Tags
              className="size-6 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {t("settings.taxonomy.noLabels")}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {labels.map((label) => {
              const isEditing = editing?.id === label.id;
              const isMutating = mutatingId === label.id;
              const archived = label.archivedAt !== undefined;

              return (
                <div
                  key={label.id}
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
                >
                  {isEditing && editing ? (
                    <Field className="min-w-0 flex-1 gap-0">
                      <FieldLabel htmlFor={editInputId} className="sr-only">
                        {t("settings.taxonomy.rename")}
                      </FieldLabel>
                      <Input
                        id={editInputId}
                        value={editing.value}
                        maxLength={MAX_LABEL_NAME_LENGTH}
                        autoFocus
                        disabled={isMutating}
                        aria-label={t("settings.taxonomy.rename")}
                        onChange={(event) =>
                          setEditing({
                            ...editing,
                            value: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setEditing(null);
                          } else if (event.key === "Enter") {
                            event.preventDefault();
                            void renameLabel();
                          }
                        }}
                      />
                    </Field>
                  ) : (
                    <div
                      className={
                        archived ? "min-w-0 flex-1 opacity-60" : "min-w-0 flex-1"
                      }
                    >
                      <p className="truncate text-sm" title={label.name}>
                        {label.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {label.builtIn ? (
                          <Badge
                            variant="secondary"
                            className="rounded-md font-normal"
                          >
                            {t("settings.taxonomy.builtIn")}
                          </Badge>
                        ) : null}
                        {archived ? (
                          <Badge
                            variant="secondary"
                            className="rounded-md font-normal"
                          >
                            {t("settings.taxonomy.hidden")}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="flex shrink-0 items-center gap-1">
                    {isEditing && editing ? (
                      <>
                        <IconActionButton
                          label={t("settings.taxonomy.save")}
                          disabled={!editing.value.trim() || isMutating}
                          onClick={() => void renameLabel()}
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
                          label={t("settings.taxonomy.cancel")}
                          disabled={isMutating}
                          onClick={() => setEditing(null)}
                        >
                          <X aria-hidden="true" />
                        </IconActionButton>
                      </>
                    ) : (
                      <>
                        {!label.builtIn && !archived ? (
                          <IconActionButton
                            label={t("settings.taxonomy.rename")}
                            disabled={mutatingId !== null}
                            onClick={() =>
                              setEditing({
                                id: label.id,
                                value: label.name,
                              })
                            }
                          >
                            <Pencil aria-hidden="true" />
                          </IconActionButton>
                        ) : null}
                        <IconActionButton
                          label={t(
                            archived
                              ? "settings.taxonomy.restore"
                              : "settings.taxonomy.hide",
                          )}
                          disabled={mutatingId !== null}
                          onClick={() => void setArchived(label)}
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
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
