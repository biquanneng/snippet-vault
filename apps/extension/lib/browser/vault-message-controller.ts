// SPDX-License-Identifier: MPL-2.0

import type {
  ConditionalMutationReceipt,
  ContextColor,
  ContextEnvironment,
  ContextPreset,
  Label,
  MutationReceipt,
  SearchResult,
  StoredRecord,
  SourceMetadata,
  VaultSnapshot,
  VaultItem,
  WorkspaceItem,
} from '../core/model';
import {
  BACKUP_FORMAT_VERSION,
  BackupFormatError,
  parseBackup,
  serializeBackup,
} from '../backup-format';
import {
  DEFAULT_CONTEXT_COLOR,
  ENVIRONMENT_CONTEXT_COLORS,
  getContextPresetColor,
} from '../context-colors';
import type {
  BrowseOptions,
  BrowsePage,
  SearchOptions,
} from '../core/vault-service';
import {
  toIntlLocale,
  translate,
  type SupportedLocale,
} from '../i18n-catalog';
import {
  ENVIRONMENT_DEFINITIONS,
  getBuiltInLabelAliases,
  getLocalizedEnvironmentName,
  getLocalizedLabelName,
} from '../localized-values';
import {
  DEFAULT_WORKSPACE_EXPIRY_DAYS,
  normalizeWorkspaceExpiryDays,
  workspaceExpiryDaysToMs,
} from '../workspace-expiry';
import {
  MAX_CONTEXT_PRESET_NAME_LENGTH,
  MAX_BACKUP_CONTENT_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  MAX_SELECTION_LENGTH,
  MESSAGE_TYPE,
  type ArchiveContextPresetRequest,
  type ArchiveLabelRequest,
  type ContextPresetListData,
  type ContextPresetManagementEntry,
  type ContextPresetManagementListData,
  type ContextPresetSummary,
  type CreateContextPresetData,
  type CreateContextPresetRequest,
  type CreateLabelData,
  type CreateLabelRequest,
  type CreateSnippetRequest,
  type DeleteItemData,
  type DeleteItemRequest,
  type BackupSummaryData,
  type ExportBackupData,
  type ExtendWorkspaceItemData,
  type ExtendWorkspaceItemRequest,
  type ExtensionResponse,
  type GetContextPresetManagementRequest,
  type GetContextPresetsRequest,
  type GetLabelManagementRequest,
  type ImportBackupData,
  type ImportBackupRequest,
  type InspectBackupRequest,
  type LabelListData,
  type LabelManagementEntry,
  type LabelManagementListData,
  type LabelSummary,
  type MutationStatusData,
  type PromoteWorkspaceItemData,
  type PromoteWorkspaceItemRequest,
  type RenameContextPresetRequest,
  type RenameLabelRequest,
  type RestoreContextPresetRequest,
  type RestoreLabelRequest,
  type SaveSelectionData,
  type SaveSelectionRequest,
  type SearchPanelData,
  type SearchPanelItem,
  type UpdateSnippetData,
  type UpdateSnippetRequest,
  type UpdateSnippetContextSelection,
  type SearchPanelRequest,
  type VaultDataRequest,
} from './message-contract';

export const DEFAULT_WORKSPACE_TTL_MS = workspaceExpiryDaysToMs(
  DEFAULT_WORKSPACE_EXPIRY_DAYS,
);

const MAX_SOURCE_TITLE_LENGTH = 500;

const DEFAULT_LABELS: readonly LabelSummary[] = [
  { id: 'ak', name: 'Access Key' },
  { id: 'sk', name: 'Secret Key' },
  { id: 'api-key', name: 'API Key' },
  { id: 'api-secret', name: 'API Secret' },
  { id: 'app-id', name: 'App ID' },
  { id: 'app-key', name: 'App Key' },
  { id: 'app-secret', name: 'App Secret' },
  { id: 'token', name: 'Token' },
  { id: 'access-token', name: 'Access Token' },
  { id: 'refresh-token', name: 'Refresh Token' },
  { id: 'account-id', name: 'Account ID' },
  { id: 'client-id', name: 'Client ID' },
  { id: 'client-secret', name: 'Client Secret' },
  { id: 'tenant-id', name: 'Tenant ID' },
  { id: 'project-id', name: 'Project ID' },
  { id: 'webhook-secret', name: 'Webhook Secret' },
  { id: 'signing-secret', name: 'Signing Secret' },
  { id: 'public-key', name: 'Public Key' },
  { id: 'private-key', name: 'Private Key' },
  { id: 'license-key', name: 'License Key' },
];

const DEFAULT_LABEL_ORDER = new Map(
  DEFAULT_LABELS.map((label, index) => [label.id, index]),
);

const DEFAULT_CONTEXT_PRESETS: readonly Omit<
  ContextPreset,
  'createdAt' | 'updatedAt'
>[] = (
  Object.entries(ENVIRONMENT_DEFINITIONS) as Array<
    [ContextEnvironment, (typeof ENVIRONMENT_DEFINITIONS)[ContextEnvironment]]
  >
).map(([environment, definition]) => ({
  id: `environment:${environment}`,
  name: definition.canonicalContext,
  color: ENVIRONMENT_CONTEXT_COLORS[environment],
  environment,
}));

const DEFAULT_CONTEXT_ORDER = new Map(
  DEFAULT_CONTEXT_PRESETS.map((preset, index) => [preset.id, index]),
);

type ControllerResponseData =
  | ContextPresetListData
  | ContextPresetManagementListData
  | CreateContextPresetData
  | CreateLabelData
  | DeleteItemData
  | ExportBackupData
  | ExtendWorkspaceItemData
  | LabelListData
  | LabelManagementListData
  | BackupSummaryData
  | ImportBackupData
  | MutationStatusData
  | PromoteWorkspaceItemData
  | SaveSelectionData
  | SearchPanelData
  | UpdateSnippetData;

export interface VaultMessageService {
  listLabels(options?: { includeArchived?: boolean }): Promise<Label[]>;
  listContextPresets(
    options?: { includeArchived?: boolean },
  ): Promise<ContextPreset[]>;
  saveLabel(label: Label): Promise<MutationReceipt>;
  saveContextPreset(preset: ContextPreset): Promise<MutationReceipt>;
  touchLabelUsage(id: string, time: number): Promise<MutationReceipt>;
  saveVaultItem(item: VaultItem): Promise<MutationReceipt>;
  saveWorkspaceItem(item: WorkspaceItem): Promise<MutationReceipt>;
  exportSnapshot(): Promise<{
    snapshot: VaultSnapshot;
    dataRevision: number;
  }>;
  getDataRevision(): Promise<number>;
  replaceSnapshot(
    snapshot: VaultSnapshot,
    expectedDataRevision: number,
  ): Promise<ConditionalMutationReceipt>;
  saveVaultItemIfUnchanged(
    item: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt>;
  saveWorkspaceItemIfUnchanged(
    item: WorkspaceItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt>;
  promoteWorkspaceItem(
    workspaceId: string,
    vaultItem: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt>;
  deleteItem(reference: {
    kind: 'vault' | 'workspace';
    id: string;
  }): Promise<MutationReceipt>;
  getItem(reference: {
    kind: 'vault' | 'workspace';
    id: string;
  }): Promise<StoredRecord | null>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  browse(
    kind: 'vault' | 'workspace',
    options?: BrowseOptions,
  ): Promise<BrowsePage>;
}

export interface MessageSenderContext {
  extensionId: string;
  senderId?: string;
  senderUrl?: string;
  tabId?: number;
  tabUrl?: string;
}

interface VaultMessageControllerOptions {
  service: VaultMessageService;
  clock?: () => number;
  idFactory?: () => string;
  workspaceExpiryDaysProvider?: () => Promise<number>;
}

interface SaveItemInput {
  content: string;
  labelIds: string[];
  temporary: boolean;
  contextId?: string;
  source?: SourceMetadata;
}

interface PreparedBackup {
  exportedAt: number;
  expiredWorkspaceItems: number;
  snapshot: VaultSnapshot;
}

export class VaultMessageController {
  private readonly service: VaultMessageService;
  private readonly clock: () => number;
  private readonly idFactory: () => string;
  private readonly workspaceExpiryDaysProvider: () => Promise<number>;
  private defaultLabelsPromise: Promise<void> | null = null;
  private defaultContextPresetsPromise: Promise<void> | null = null;

  constructor(options: VaultMessageControllerOptions) {
    this.service = options.service;
    this.clock = options.clock ?? Date.now;
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
    this.workspaceExpiryDaysProvider =
      options.workspaceExpiryDaysProvider ??
      (() => Promise.resolve(DEFAULT_WORKSPACE_EXPIRY_DAYS));
  }

  async handle(
    request: VaultDataRequest,
    sender: MessageSenderContext,
  ): Promise<ExtensionResponse<ControllerResponseData>> {
    const locale = request.locale ?? 'en';
    if (!this.isAuthorizedSender(request, sender)) {
      return failure(
        'UNAUTHORIZED',
        translate(locale, 'errors.unauthorized'),
      );
    }

    if (request.type === MESSAGE_TYPE.getLabels) {
      return this.getLabels(locale);
    }
    if (request.type === MESSAGE_TYPE.getLabelManagement) {
      return this.getLabelManagement(locale);
    }
    if (request.type === MESSAGE_TYPE.createLabel) {
      return this.createLabel(request, locale);
    }
    if (request.type === MESSAGE_TYPE.renameLabel) {
      return this.renameLabel(request, locale);
    }
    if (request.type === MESSAGE_TYPE.archiveLabel) {
      return this.archiveLabel(request, locale);
    }
    if (request.type === MESSAGE_TYPE.restoreLabel) {
      return this.restoreLabel(request, locale);
    }
    if (request.type === MESSAGE_TYPE.getContextPresets) {
      return this.getContextPresets(locale);
    }
    if (request.type === MESSAGE_TYPE.getContextPresetManagement) {
      return this.getContextPresetManagement(locale);
    }
    if (request.type === MESSAGE_TYPE.createContextPreset) {
      return this.createContextPreset(request, locale);
    }
    if (request.type === MESSAGE_TYPE.renameContextPreset) {
      return this.renameContextPreset(request, locale);
    }
    if (request.type === MESSAGE_TYPE.archiveContextPreset) {
      return this.archiveContextPreset(request, locale);
    }
    if (request.type === MESSAGE_TYPE.restoreContextPreset) {
      return this.restoreContextPreset(request, locale);
    }
    if (request.type === MESSAGE_TYPE.deleteItem) {
      return this.deleteItem(request);
    }
    if (request.type === MESSAGE_TYPE.exportBackup) {
      return this.exportBackup(locale);
    }
    if (request.type === MESSAGE_TYPE.inspectBackup) {
      return this.inspectBackup(request, locale);
    }
    if (request.type === MESSAGE_TYPE.importBackup) {
      return this.importBackup(request, locale);
    }
    if (request.type === MESSAGE_TYPE.extendWorkspaceItem) {
      return this.extendWorkspaceItem(request, locale);
    }
    if (request.type === MESSAGE_TYPE.promoteWorkspaceItem) {
      return this.promoteWorkspaceItem(request, locale);
    }
    if (request.type === MESSAGE_TYPE.createSnippet) {
      return this.createSnippet(request, locale);
    }
    if (request.type === MESSAGE_TYPE.updateSnippet) {
      return this.updateSnippet(request, locale);
    }
    if (request.type === MESSAGE_TYPE.searchPanel) {
      return this.searchPanel(request, locale);
    }

    return this.saveSelection(request, sender, locale);
  }

  private async exportBackup(
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<ExportBackupData>> {
    await Promise.all([
      this.ensureDefaultLabels(),
      this.ensureDefaultContextPresets(),
    ]);
    const exportedAt = this.clock();
    const { snapshot } = await this.service.exportSnapshot();

    try {
      const contents = serializeBackup(snapshot, { exportedAt });

      if (
        contents.length > MAX_BACKUP_CONTENT_LENGTH ||
        new TextEncoder().encode(contents).byteLength >
          MAX_BACKUP_CONTENT_LENGTH
      ) {
        return failure(
          'BACKUP_TOO_LARGE',
          translate(locale, 'errors.backupTooLarge'),
        );
      }

      return {
        ok: true,
        data: {
          contents,
          fileName: createBackupFileName(exportedAt),
          mimeType: 'application/json',
        },
      };
    } catch (error: unknown) {
      return this.toBackupFailure(error, locale);
    }
  }

  private async inspectBackup(
    request: InspectBackupRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<BackupSummaryData>> {
    try {
      const prepared = this.prepareBackup(request.payload.contents);
      const expectedDataRevision = await this.service.getDataRevision();
      return {
        ok: true,
        data: toBackupSummary(prepared, expectedDataRevision),
      };
    } catch (error: unknown) {
      return this.toBackupFailure(error, locale);
    }
  }

  private async importBackup(
    request: ImportBackupRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<ImportBackupData>> {
    try {
      const prepared = this.prepareBackup(request.payload.contents);
      const receipt = await this.service.replaceSnapshot(
        prepared.snapshot,
        request.payload.expectedDataRevision,
      );
      if (receipt.outcome === 'conflict') {
        return failure(
          'CONFLICT',
          translate(locale, 'errors.backupConflict'),
        );
      }
      if (receipt.outcome !== 'updated') {
        return failure(
          'INVALID_BACKUP',
          translate(locale, 'errors.invalidBackup'),
        );
      }

      return {
        ok: true,
        data: {
          ...toBackupSummary(prepared, request.payload.expectedDataRevision),
          dataRevision: receipt.dataRevision,
          searchStatus: receipt.searchStatus,
        },
      };
    } catch (error: unknown) {
      return this.toBackupFailure(error, locale);
    }
  }

  private prepareBackup(contents: string): PreparedBackup {
    const parsed = parseBackup(contents);
    this.assertRequiredBackupTaxonomy(parsed.snapshot);
    const now = this.clock();
    let expiredWorkspaceItems = 0;
    const records = parsed.snapshot.records.filter((record) => {
      if (record.kind === 'workspace' && record.item.expiresAt <= now) {
        expiredWorkspaceItems += 1;
        return false;
      }
      return true;
    });

    return {
      exportedAt: parsed.exportedAt,
      expiredWorkspaceItems,
      snapshot: {
        ...parsed.snapshot,
        records,
      },
    };
  }

  private assertRequiredBackupTaxonomy(snapshot: VaultSnapshot): void {
    const labelIds = new Set(snapshot.labels.map((label) => label.id));
    const contextIds = new Set(
      snapshot.contextPresets.map((preset) => preset.id),
    );
    if (
      DEFAULT_LABELS.some((label) => !labelIds.has(label.id)) ||
      DEFAULT_CONTEXT_PRESETS.some((preset) => !contextIds.has(preset.id))
    ) {
      throw new BackupFormatError(
        'invalid',
        'The backup is missing required built-in taxonomy.',
      );
    }
  }

  private toBackupFailure(
    error: unknown,
    locale: SupportedLocale,
  ): ExtensionResponse<never> {
    if (!(error instanceof BackupFormatError)) {
      return failure('INTERNAL_ERROR', translate(locale, 'errors.internal'));
    }
    if (error.code === 'unsupported') {
      return failure(
        'UNSUPPORTED_BACKUP_VERSION',
        translate(locale, 'errors.unsupportedBackup'),
      );
    }
    return failure('INVALID_BACKUP', translate(locale, 'errors.invalidBackup'));
  }

  private async getLabels(
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<LabelListData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels();

    return {
      ok: true,
      data: {
        labels: this.sortLabels(labels, locale).map((label) =>
          toLocalizedLabelSummary(label, locale),
        ),
      },
    };
  }

  private async getLabelManagement(
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<LabelManagementListData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels({ includeArchived: true });
    return {
      ok: true,
      data: {
        labels: this.sortManagedLabels(labels, locale).map((label) => ({
          ...toLocalizedLabelSummary(label, locale),
          usageCount: label.usageCount,
          ...(label.lastUsedAt !== undefined
            ? { lastUsedAt: label.lastUsedAt }
            : {}),
          ...(label.archivedAt !== undefined
            ? { archivedAt: label.archivedAt }
            : {}),
          builtIn: isBuiltInLabelId(label.id),
        })),
      },
    };
  }

  private async createLabel(
    request: CreateLabelRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<CreateLabelData>> {
    const name = request.payload.name.trim();
    if (!name || name.length > MAX_LABEL_NAME_LENGTH) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.labelLength', [
          new Intl.NumberFormat(toIntlLocale(locale)).format(
            MAX_LABEL_NAME_LENGTH,
          ),
        ]),
      );
    }

    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels({ includeArchived: true });
    const existing = labels.find((label) =>
      this.matchesLabelName(label, name, locale),
    );

    if (existing && existing.archivedAt === undefined) {
      return {
        ok: true,
        data: {
          label: toLocalizedLabelSummary(existing, locale),
          created: false,
        },
      };
    }

    if (existing) {
      const now = this.clock();
      const restored: Label = {
        ...existing,
        name: isBuiltInLabelId(existing.id) ? existing.name : name,
        archivedAt: undefined,
        updatedAt: now,
      };
      await this.service.saveLabel(restored);
      return {
        ok: true,
        data: {
          label: toLocalizedLabelSummary(restored, locale),
          created: false,
          restored: true,
        },
      };
    }

    const now = this.clock();
    const label: Label = {
      id: `custom:${this.idFactory()}`,
      name,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    await this.service.saveLabel(label);

    return {
      ok: true,
      data: {
        label: { id: label.id, name: label.name },
        created: true,
      },
    };
  }

  private async renameLabel(
    request: RenameLabelRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    const name = request.payload.name.trim();
    if (!name || name.length > MAX_LABEL_NAME_LENGTH) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.labelLength', [
          new Intl.NumberFormat(toIntlLocale(locale)).format(
            MAX_LABEL_NAME_LENGTH,
          ),
        ]),
      );
    }

    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels({ includeArchived: true });
    const label = labels.find((candidate) => candidate.id === request.payload.id);
    if (!label) {
      return { ok: true, data: { updated: false } };
    }
    if (isBuiltInLabelId(label.id)) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.invalidLabel'),
      );
    }
    if (this.hasConflictingLabelName(labels, label.id, name, locale)) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.invalidLabel'),
      );
    }

    if (label.name === name) {
      return { ok: true, data: { updated: false } };
    }

    await this.service.saveLabel({
      ...label,
      name,
      updatedAt: this.clock(),
    });
    return { ok: true, data: { updated: true } };
  }

  private async archiveLabel(
    request: ArchiveLabelRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels({ includeArchived: true });
    const label = labels.find((candidate) => candidate.id === request.payload.id);
    if (!label || label.archivedAt !== undefined) {
      return { ok: true, data: { updated: false } };
    }

    await this.service.saveLabel({
      ...label,
      archivedAt: this.clock(),
      updatedAt: this.clock(),
    });
    return { ok: true, data: { updated: true } };
  }

  private async restoreLabel(
    request: RestoreLabelRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels({ includeArchived: true });
    const label = labels.find((candidate) => candidate.id === request.payload.id);
    if (!label || label.archivedAt === undefined) {
      return { ok: true, data: { updated: false } };
    }
    if (this.hasConflictingLabelName(labels, label.id, label.name, locale)) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.invalidLabel'),
      );
    }

    await this.service.saveLabel({
      ...label,
      archivedAt: undefined,
      updatedAt: this.clock(),
    });
    return { ok: true, data: { updated: true } };
  }

  private async getContextPresets(
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<ContextPresetListData>> {
    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets();
    return {
      ok: true,
      data: {
        contextPresets: this.sortContextPresets(presets).map((preset) =>
          toContextPresetSummary(preset, locale),
        ),
      },
    };
  }

  private async getContextPresetManagement(
    locale: SupportedLocale,
  ): Promise<
    ExtensionResponse<ContextPresetManagementListData>
  > {
    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets({
      includeArchived: true,
    });
    return {
      ok: true,
      data: {
        contextPresets: this.sortManagedContextPresets(presets).map((preset) => ({
          ...toContextPresetSummary(preset, locale),
          ...(preset.archivedAt !== undefined
            ? { archivedAt: preset.archivedAt }
            : {}),
          builtIn: isBuiltInContextPreset(preset),
        })),
      },
    };
  }

  private async createContextPreset(
    request: CreateContextPresetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<CreateContextPresetData>> {
    const name = request.payload.name.trim();
    const color = request.payload.color ?? DEFAULT_CONTEXT_COLOR;
    if (!name || name.length > MAX_CONTEXT_PRESET_NAME_LENGTH) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.contextTooLong'),
      );
    }

    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets({
      includeArchived: true,
    });
    const existing = this.findMatchingContextPreset(
      presets,
      name,
      request.payload.environment,
    );

    if (existing && existing.archivedAt === undefined) {
      return {
        ok: true,
        data: {
          contextPreset: toContextPresetSummary(existing, locale),
          created: false,
        },
      };
    }

    if (existing) {
      const restored = restoreContextPresetRecord(
        existing,
        name,
        color,
        request.payload.environment,
        this.clock(),
      );
      await this.service.saveContextPreset(restored);
      return {
        ok: true,
        data: {
          contextPreset: toContextPresetSummary(restored, locale),
          created: false,
          restored: true,
        },
      };
    }

    const now = this.clock();
    const preset: ContextPreset = {
      id: `context:${this.idFactory()}`,
      name,
      color,
      ...(request.payload.environment
        ? { environment: request.payload.environment }
        : {}),
      createdAt: now,
      updatedAt: now,
    };
    await this.service.saveContextPreset(preset);

    return {
      ok: true,
      data: {
        contextPreset: toContextPresetSummary(preset, locale),
        created: true,
      },
    };
  }

  private async renameContextPreset(
    request: RenameContextPresetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    const name = request.payload.name.trim();
    if (!name || name.length > MAX_CONTEXT_PRESET_NAME_LENGTH) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.contextTooLong'),
      );
    }

    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets({
      includeArchived: true,
    });
    const preset = presets.find((candidate) => candidate.id === request.payload.id);
    if (!preset) {
      return { ok: true, data: { updated: false } };
    }
    if (isBuiltInContextPreset(preset)) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.invalidRequest'),
      );
    }
    if (
      this.hasConflictingContextPreset(
        presets,
        preset.id,
        name,
        preset.environment,
      )
    ) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.invalidRequest'),
      );
    }
    const color = request.payload.color ?? getContextPresetColor(preset);
    if (preset.name === name && getContextPresetColor(preset) === color) {
      return { ok: true, data: { updated: false } };
    }

    await this.service.saveContextPreset({
      ...preset,
      name,
      color,
      updatedAt: this.clock(),
    });
    return { ok: true, data: { updated: true } };
  }

  private async archiveContextPreset(
    request: ArchiveContextPresetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets({
      includeArchived: true,
    });
    const preset = presets.find((candidate) => candidate.id === request.payload.id);
    if (!preset || preset.archivedAt !== undefined) {
      return { ok: true, data: { updated: false } };
    }

    const now = this.clock();
    await this.service.saveContextPreset({
      ...preset,
      archivedAt: now,
      updatedAt: now,
    });
    return { ok: true, data: { updated: true } };
  }

  private async restoreContextPreset(
    request: RestoreContextPresetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<MutationStatusData>> {
    await this.ensureDefaultContextPresets();
    const presets = await this.service.listContextPresets({
      includeArchived: true,
    });
    const preset = presets.find((candidate) => candidate.id === request.payload.id);
    if (!preset || preset.archivedAt === undefined) {
      return { ok: true, data: { updated: false } };
    }
    if (
      this.hasConflictingContextPreset(
        presets,
        preset.id,
        preset.name,
        preset.environment,
      )
    ) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.invalidRequest'),
      );
    }

    await this.service.saveContextPreset({
      ...preset,
      archivedAt: undefined,
      updatedAt: this.clock(),
    });
    return { ok: true, data: { updated: true } };
  }

  private async saveSelection(
    request: SaveSelectionRequest,
    sender: MessageSenderContext,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<SaveSelectionData>> {
    const validationError = this.validateSelection(request, locale);
    if (validationError) {
      return validationError;
    }

    const source = createSource(
      normalizeOptionalText(
        request.payload.sourceTitle,
        MAX_SOURCE_TITLE_LENGTH,
      ),
      sender.tabUrl ?? sender.senderUrl,
    );

    return this.saveItem(
      {
        content: request.payload.content,
        labelIds: request.payload.labelIds,
        temporary: request.payload.temporary,
        contextId: request.payload.contextId,
        ...(source ? { source } : {}),
      },
      locale,
    );
  }

  private async createSnippet(
    request: CreateSnippetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<SaveSelectionData>> {
    const validationError = this.validateContent(request.payload.content, locale);
    if (validationError) {
      return validationError;
    }

    return this.saveItem(
      {
        content: request.payload.content,
        labelIds: request.payload.labelIds,
        temporary: request.payload.kind === 'workspace',
        contextId: request.payload.contextId,
      },
      locale,
    );
  }

  private async saveItem(
    input: SaveItemInput,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<SaveSelectionData>> {
    await Promise.all([
      this.ensureDefaultLabels(),
      this.ensureDefaultContextPresets(),
    ]);
    const [labels, contextPresets] = await Promise.all([
      this.service.listLabels(),
      this.service.listContextPresets(),
    ]);
    const labelById = new Map(labels.map((label) => [label.id, label]));
    const selectedLabels = input.labelIds.flatMap((labelId) => {
      const label = labelById.get(labelId);
      return label ? [label] : [];
    });

    if (
      new Set(input.labelIds).size !== input.labelIds.length ||
      selectedLabels.length !== input.labelIds.length
    ) {
      return failure(
        'INVALID_LABEL',
        translate(locale, 'errors.invalidLabel'),
      );
    }

    const contextResolution = this.resolveContextId(
      input.contextId,
      contextPresets,
      locale,
    );
    if (!contextResolution.ok) {
      return contextResolution.error;
    }

    const now = this.clock();
    const id = this.idFactory();
    const baseItem = {
      id,
      content: input.content,
      labelIds: selectedLabels.map((label) => label.id),
      ...(contextResolution.contextId
        ? { contextId: contextResolution.contextId }
        : {}),
      ...(input.source ? { source: input.source } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const receipt = input.temporary
      ? await this.service.saveWorkspaceItem({
          ...baseItem,
          expiresAt: now + await this.getWorkspaceTtlMs(),
        })
      : await this.service.saveVaultItem({
          ...baseItem,
          pinned: false,
        });

    let labelStatus: SaveSelectionData['labelStatus'] = 'updated';
    for (const selectedLabel of selectedLabels) {
      try {
        await this.service.touchLabelUsage(selectedLabel.id, now);
      } catch {
        labelStatus = 'stale';
      }
    }

    return {
      ok: true,
      data: {
        id,
        kind: input.temporary ? 'workspace' : 'vault',
        searchStatus: receipt.searchStatus,
        labelStatus,
      },
    };
  }

  private async deleteItem(
    request: DeleteItemRequest,
  ): Promise<ExtensionResponse<DeleteItemData>> {
    const receipt = await this.service.deleteItem({
      kind: request.payload.kind,
      id: request.payload.id,
    });

    return {
      ok: true,
      data: {
        searchStatus: receipt.searchStatus,
      },
    };
  }

  private async extendWorkspaceItem(
    request: ExtendWorkspaceItemRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<ExtendWorkspaceItemData>> {
    const existing = await this.service.getItem({
      kind: 'workspace',
      id: request.payload.id,
    });
    if (!existing || existing.kind !== 'workspace') {
      return this.toUpdateFailure('not-found', locale);
    }
    if (existing.item.updatedAt !== request.payload.expectedUpdatedAt) {
      return this.toUpdateFailure('conflict', locale);
    }

    const clockNow = this.clock();
    if (existing.item.expiresAt <= clockNow) {
      return this.toUpdateFailure('not-found', locale);
    }

    const addedDays = await this.getWorkspaceExpiryDaysValue();
    const addedMs = workspaceExpiryDaysToMs(addedDays);
    if (existing.item.expiresAt > Number.MAX_SAFE_INTEGER - addedMs) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.invalidRequest'),
      );
    }

    const updatedAt = Math.max(clockNow, existing.item.updatedAt + 1);
    const expiresAt = existing.item.expiresAt + addedMs;
    const receipt = await this.service.saveWorkspaceItemIfUnchanged(
      {
        ...existing.item,
        updatedAt,
        expiresAt,
      },
      request.payload.expectedUpdatedAt,
    );
    if (receipt.outcome !== 'updated') {
      return this.toUpdateFailure(receipt.outcome, locale);
    }

    return {
      ok: true,
      data: {
        id: existing.item.id,
        updatedAt,
        expiresAt,
        addedDays,
        searchStatus: receipt.searchStatus,
      },
    };
  }

  private async promoteWorkspaceItem(
    request: PromoteWorkspaceItemRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<PromoteWorkspaceItemData>> {
    const existing = await this.service.getItem({
      kind: 'workspace',
      id: request.payload.id,
    });
    if (!existing || existing.kind !== 'workspace') {
      return this.toUpdateFailure('not-found', locale);
    }
    if (existing.item.updatedAt !== request.payload.expectedUpdatedAt) {
      return this.toUpdateFailure('conflict', locale);
    }

    const clockNow = this.clock();
    if (existing.item.expiresAt <= clockNow) {
      return this.toUpdateFailure('not-found', locale);
    }

    const { expiresAt: _expiresAt, ...baseItem } = existing.item;
    const updatedAt = Math.max(clockNow, existing.item.updatedAt + 1);
    const receipt = await this.service.promoteWorkspaceItem(
      existing.item.id,
      {
        ...baseItem,
        pinned: false,
        updatedAt,
      },
      request.payload.expectedUpdatedAt,
    );
    if (receipt.outcome !== 'updated') {
      return this.toUpdateFailure(receipt.outcome, locale);
    }

    return {
      ok: true,
      data: {
        id: existing.item.id,
        kind: 'vault',
        updatedAt,
        searchStatus: receipt.searchStatus,
      },
    };
  }

  private async updateSnippet(
    request: UpdateSnippetRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<UpdateSnippetData>> {
    const contentError = this.validateContent(request.payload.content, locale);
    if (contentError) {
      return contentError;
    }

    await Promise.all([
      this.ensureDefaultLabels(),
      this.ensureDefaultContextPresets(),
    ]);

    const existing = await this.service.getItem({
      kind: request.payload.kind,
      id: request.payload.id,
    });
    if (!existing) {
      return failure(
        'NOT_FOUND',
        translate(locale, 'errors.snippetNotFound'),
      );
    }
    if (existing.item.updatedAt !== request.payload.expectedUpdatedAt) {
      return this.toUpdateFailure('conflict', locale);
    }

    const [labels, contextPresets] = await Promise.all([
      this.service.listLabels({ includeArchived: true }),
      this.service.listContextPresets({ includeArchived: true }),
    ]);

    const labelSelection = this.resolveUpdatedLabels(
      existing.item.labelIds,
      request.payload.labelIds,
      labels,
      locale,
    );
    if (!labelSelection.ok) {
      return labelSelection.error;
    }

    const contextSelection = this.resolveUpdatedContext(
      existing.item.contextId,
      request.payload.context,
      contextPresets,
      locale,
    );
    if (!contextSelection.ok) {
      return contextSelection.error;
    }

    const now = Math.max(
      this.clock(),
      existing.item.updatedAt + 1,
    );
    const updatedContent = {
      content: request.payload.content,
      labelIds: labelSelection.labelIds,
      updatedAt: now,
    };

    let receipt: MutationReceipt;
    let expiresAt: number | undefined;
    if (existing.kind === 'workspace') {
      const expiryResolution = this.resolveUpdatedWorkspaceExpiry(
        existing.item,
        request,
        now,
        locale,
      );
      if (!expiryResolution.ok) {
        return expiryResolution.error;
      }
      expiresAt = expiryResolution.expiresAt;
      const updatedItem: WorkspaceItem = {
        ...existing.item,
        ...updatedContent,
        ...(contextSelection.contextId
          ? { contextId: contextSelection.contextId }
          : {}),
        expiresAt,
      };
      if (contextSelection.contextId === undefined) {
        delete updatedItem.contextId;
      }
      const mutation = await this.service.saveWorkspaceItemIfUnchanged(
        updatedItem,
        request.payload.expectedUpdatedAt,
      );
      if (mutation.outcome !== 'updated') {
        return this.toUpdateFailure(mutation.outcome, locale);
      }
      receipt = mutation;
    } else {
      const updatedItem: VaultItem = {
        ...existing.item,
        ...updatedContent,
        ...(contextSelection.contextId
          ? { contextId: contextSelection.contextId }
          : {}),
      };
      if (contextSelection.contextId === undefined) {
        delete updatedItem.contextId;
      }
      const mutation = await this.service.saveVaultItemIfUnchanged(
        updatedItem,
        request.payload.expectedUpdatedAt,
      );
      if (mutation.outcome !== 'updated') {
        return this.toUpdateFailure(mutation.outcome, locale);
      }
      receipt = mutation;
    }

    let labelStatus: UpdateSnippetData['labelStatus'] = 'updated';
    for (const addedLabelId of labelSelection.newlyAddedActiveLabelIds) {
      try {
        await this.service.touchLabelUsage(addedLabelId, now);
      } catch {
        labelStatus = 'stale';
      }
    }

    return {
      ok: true,
      data: {
        id: existing.item.id,
        kind: existing.kind,
        updatedAt: now,
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        searchStatus: receipt.searchStatus,
        labelStatus,
      },
    };
  }

  private toUpdateFailure(
    outcome: 'conflict' | 'not-found',
    locale: SupportedLocale,
  ): ExtensionResponse<never> {
    if (outcome === 'conflict') {
      return failure(
        'CONFLICT',
        translate(locale, 'errors.snippetConflict'),
      );
    }

    return failure(
      'NOT_FOUND',
      translate(locale, 'errors.snippetNotFound'),
    );
  }

  private async searchPanel(
    request: SearchPanelRequest,
    locale: SupportedLocale,
  ): Promise<ExtensionResponse<SearchPanelData>> {
    await Promise.all([
      this.ensureDefaultLabels(),
      this.ensureDefaultContextPresets(),
    ]);
    const [labels, contextPresets] = await Promise.all([
      this.service.listLabels({ includeArchived: true }),
      this.service.listContextPresets({ includeArchived: true }),
    ]);
    const labelById = new Map(
      labels.map((label) => [
        label.id,
        toLocalizedLabelSummary(label, locale),
      ]),
    );
    const contextById = new Map(
      contextPresets.map((preset) => [
        preset.id,
        toContextPresetSummary(preset, locale),
      ]),
    );
    const query = request.payload.query.trim();

    if (query) {
      const results = await this.service.search(query, {
        kind: request.payload.kind,
        limit: 50,
        contextId: request.payload.contextId,
        labelId: request.payload.labelId,
      });
      return {
        ok: true,
        data: {
          kind: request.payload.kind,
          query,
          items: toSearchPanelItems(results, labelById, contextById),
          pagination: null,
        },
      };
    }

    const page = await this.service.browse(request.payload.kind, {
      offset: request.payload.page * request.payload.pageSize,
      limit: request.payload.pageSize,
      contextId: request.payload.contextId,
      labelId: request.payload.labelId,
    });
    return {
      ok: true,
      data: {
        kind: request.payload.kind,
        query: '',
        items: toSearchPanelItems(page.results, labelById, contextById),
        pagination: {
          page: request.payload.page,
          pageSize: page.limit,
          total: page.total,
          totalPages: Math.ceil(page.total / page.limit),
        },
      },
    };
  }

  private validateSelection(
    request: SaveSelectionRequest,
    locale: SupportedLocale,
  ): ExtensionResponse<never> | null {
    const { content, sourceTitle } = request.payload;
    const contentError = this.validateContent(content, locale);
    if (contentError) {
      return contentError;
    }
    if (sourceTitle && sourceTitle.trim().length > MAX_SOURCE_TITLE_LENGTH) {
      return failure(
        'INVALID_MESSAGE',
        translate(locale, 'errors.sourceTitleTooLong'),
      );
    }
    return null;
  }

  private resolveUpdatedLabels(
    currentLabelIds: string[],
    requestedLabelIds: string[],
    labels: Label[],
    locale: SupportedLocale,
  ):
    | {
        ok: true;
        labelIds: string[];
        newlyAddedActiveLabelIds: string[];
      }
    | { ok: false; error: ExtensionResponse<never> } {
    const labelById = new Map(labels.map((label) => [label.id, label]));
    const currentLabelIdSet = new Set(currentLabelIds);
    const selectedLabels = requestedLabelIds.flatMap((labelId) => {
      const label = labelById.get(labelId);
      return label ? [label] : [];
    });

    if (
      new Set(requestedLabelIds).size !== requestedLabelIds.length ||
      selectedLabels.length !== requestedLabelIds.length
    ) {
      return {
        ok: false,
        error: failure(
          'INVALID_LABEL',
          translate(locale, 'errors.invalidLabel'),
        ),
      };
    }

    for (const selectedLabel of selectedLabels) {
      if (
        selectedLabel.archivedAt !== undefined &&
        !currentLabelIdSet.has(selectedLabel.id)
      ) {
        return {
          ok: false,
          error: failure(
            'INVALID_LABEL',
            translate(locale, 'errors.invalidLabel'),
          ),
        };
      }
    }

    return {
      ok: true,
      labelIds: selectedLabels.map((label) => label.id),
      newlyAddedActiveLabelIds: selectedLabels
        .filter(
          (label) =>
            label.archivedAt === undefined &&
            !currentLabelIdSet.has(label.id),
        )
        .map((label) => label.id),
    };
  }

  private resolveUpdatedContext(
    currentContextId: string | undefined,
    selection: UpdateSnippetContextSelection | undefined,
    contextPresets: ContextPreset[],
    locale: SupportedLocale,
  ):
    | {
        ok: true;
        contextId: string | undefined;
      }
    | { ok: false; error: ExtensionResponse<never> } {
    if (!selection || selection.mode === 'preserve') {
      return {
        ok: true,
        contextId: currentContextId,
      };
    }

    if (selection.mode === 'clear') {
      return {
        ok: true,
        contextId: undefined,
      };
    }

    const preset = contextPresets.find(
      (candidate) => candidate.id === selection.contextId,
    );
    if (!preset || preset.archivedAt !== undefined) {
      return {
        ok: false,
        error: failure(
          'INVALID_MESSAGE',
          translate(locale, 'errors.invalidRequest'),
        ),
      };
    }

    return {
      ok: true,
      contextId: preset.id,
    };
  }

  private resolveUpdatedWorkspaceExpiry(
    item: WorkspaceItem,
    request: UpdateSnippetRequest,
    now: number,
    locale: SupportedLocale,
  ):
    | { ok: true; expiresAt: number }
    | { ok: false; error: ExtensionResponse<never> } {
    if (
      request.payload.kind !== 'workspace' ||
      request.payload.expiresAt === undefined
    ) {
      return {
        ok: true,
        expiresAt: item.expiresAt,
      };
    }

    if (request.payload.expiresAt <= now) {
      return {
        ok: false,
        error: failure(
          'INVALID_MESSAGE',
          translate(locale, 'errors.expiryFuture'),
        ),
      };
    }

    return {
      ok: true,
      expiresAt: request.payload.expiresAt,
    };
  }

  private validateContent(
    content: string,
    locale: SupportedLocale,
  ): ExtensionResponse<never> | null {
    if (!content.trim() || content.length > MAX_SELECTION_LENGTH) {
      return failure(
        'INVALID_SELECTION',
        translate(locale, 'errors.selectionLength', [
          new Intl.NumberFormat(toIntlLocale(locale)).format(
            MAX_SELECTION_LENGTH,
          ),
        ]),
      );
    }
    return null;
  }

  private async ensureDefaultLabels(): Promise<void> {
    if (!this.defaultLabelsPromise) {
      this.defaultLabelsPromise = this.createMissingDefaultLabels().catch(
        (error) => {
          this.defaultLabelsPromise = null;
          throw error;
        },
      );
    }
    return this.defaultLabelsPromise;
  }

  private async ensureDefaultContextPresets(): Promise<void> {
    if (!this.defaultContextPresetsPromise) {
      this.defaultContextPresetsPromise =
        this.createMissingDefaultContextPresets().catch((error) => {
          this.defaultContextPresetsPromise = null;
          throw error;
        });
    }
    return this.defaultContextPresetsPromise;
  }

  private async createMissingDefaultLabels(): Promise<void> {
    const existing = await this.service.listLabels({ includeArchived: true });
    const existingIds = new Set(existing.map((label) => label.id));
    const now = this.clock();

    for (const label of DEFAULT_LABELS) {
      if (!existingIds.has(label.id)) {
        await this.service.saveLabel({
          ...label,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  private async createMissingDefaultContextPresets(): Promise<void> {
    const existing = await this.service.listContextPresets({
      includeArchived: true,
    });
    const existingIds = new Set(existing.map((preset) => preset.id));
    const now = this.clock();

    for (const preset of DEFAULT_CONTEXT_PRESETS) {
      if (!existingIds.has(preset.id)) {
        await this.service.saveContextPreset({
          ...preset,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  private async getWorkspaceTtlMs(): Promise<number> {
    return workspaceExpiryDaysToMs(
      await this.getWorkspaceExpiryDaysValue(),
    );
  }

  private async getWorkspaceExpiryDaysValue(): Promise<number> {
    try {
      return normalizeWorkspaceExpiryDays(
        await this.workspaceExpiryDaysProvider(),
      );
    } catch (error: unknown) {
      console.error(
        '[SnippetVault] Failed to resolve the workspace expiry preference',
        error,
      );
      return DEFAULT_WORKSPACE_EXPIRY_DAYS;
    }
  }

  private sortLabels(
    labels: Label[],
    locale: SupportedLocale,
  ): Label[] {
    const collator = new Intl.Collator(toIntlLocale(locale));
    return [...labels].sort((left, right) => {
      if ((left.lastUsedAt ?? 0) !== (right.lastUsedAt ?? 0)) {
        return (right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0);
      }
      if (left.usageCount !== right.usageCount) {
        return right.usageCount - left.usageCount;
      }
      const leftDefault = DEFAULT_LABEL_ORDER.get(left.id);
      const rightDefault = DEFAULT_LABEL_ORDER.get(right.id);
      if (leftDefault !== undefined || rightDefault !== undefined) {
        return (
          (leftDefault ?? Number.POSITIVE_INFINITY) -
          (rightDefault ?? Number.POSITIVE_INFINITY)
        );
      }
      return collator.compare(
        getLocalizedLabelName(left.id, left.name, locale),
        getLocalizedLabelName(right.id, right.name, locale),
      );
    });
  }

  private sortManagedLabels(
    labels: Label[],
    locale: SupportedLocale,
  ): Label[] {
    return [...labels].sort((left, right) => {
      if ((left.archivedAt === undefined) !== (right.archivedAt === undefined)) {
        return left.archivedAt === undefined ? -1 : 1;
      }
      return this.sortLabels([left, right], locale)[0] === left ? -1 : 1;
    });
  }

  private sortContextPresets(
    presets: ContextPreset[],
  ): ContextPreset[] {
    return [...presets].sort((left, right) => {
      const leftDefault = DEFAULT_CONTEXT_ORDER.get(left.id);
      const rightDefault = DEFAULT_CONTEXT_ORDER.get(right.id);
      if (leftDefault !== undefined || rightDefault !== undefined) {
        return (
          (leftDefault ?? Number.POSITIVE_INFINITY) -
          (rightDefault ?? Number.POSITIVE_INFINITY)
        );
      }
      return left.name.localeCompare(right.name);
    });
  }

  private sortManagedContextPresets(
    presets: ContextPreset[],
  ): ContextPreset[] {
    return [...presets].sort((left, right) => {
      if ((left.archivedAt === undefined) !== (right.archivedAt === undefined)) {
        return left.archivedAt === undefined ? -1 : 1;
      }
      return this.sortContextPresets([left, right])[0] === left ? -1 : 1;
    });
  }

  private matchesLabelName(
    label: Pick<Label, 'id' | 'name'>,
    name: string,
    locale: SupportedLocale,
  ): boolean {
    const collator = new Intl.Collator(toIntlLocale(locale), {
      sensitivity: 'accent',
    });
    return getComparableLabelNames(label).some(
      (candidate) => collator.compare(candidate, name) === 0,
    );
  }

  private hasConflictingLabelName(
    labels: Label[],
    currentId: string,
    name: string,
    locale: SupportedLocale,
  ): boolean {
    return labels.some(
      (label) =>
        label.id !== currentId &&
        label.archivedAt === undefined &&
        this.matchesLabelName(label, name, locale),
    );
  }

  private findMatchingContextPreset(
    presets: ContextPreset[],
    name: string,
    environment: ContextEnvironment | undefined,
  ): ContextPreset | undefined {
    const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
    return presets.find((preset) => {
      if (environment && preset.environment === environment) {
        return true;
      }
      return collator.compare(preset.name, name) === 0;
    });
  }

  private hasConflictingContextPreset(
    presets: ContextPreset[],
    currentId: string,
    name: string,
    environment: ContextEnvironment | undefined,
  ): boolean {
    const collator = new Intl.Collator(undefined, { sensitivity: 'accent' });
    return presets.some((preset) => {
      if (preset.id === currentId || preset.archivedAt !== undefined) {
        return false;
      }
      if (environment && preset.environment === environment) {
        return true;
      }
      return collator.compare(preset.name, name) === 0;
    });
  }

  private resolveContextId(
    contextId: string | undefined,
    contextPresets: ContextPreset[],
    locale: SupportedLocale,
  ):
    | {
        ok: true;
        contextId: string | undefined;
      }
    | { ok: false; error: ExtensionResponse<never> } {
    if (!contextId) {
      return { ok: true, contextId: undefined };
    }

    const preset = contextPresets.find((candidate) => candidate.id === contextId);
    if (!preset) {
      return {
        ok: false,
        error: failure(
          'INVALID_MESSAGE',
          translate(locale, 'errors.invalidRequest'),
        ),
      };
    }

    return {
      ok: true,
      contextId: preset.id,
    };
  }

  private isAuthorizedSender(
    request: VaultDataRequest,
    sender: MessageSenderContext,
  ): boolean {
    if (this.isTrustedContentScript(sender)) {
      return (
        request.type === MESSAGE_TYPE.createLabel ||
        request.type === MESSAGE_TYPE.createSnippet ||
        request.type === MESSAGE_TYPE.deleteItem ||
        request.type === MESSAGE_TYPE.getContextPresets ||
        request.type === MESSAGE_TYPE.getLabels ||
        request.type === MESSAGE_TYPE.searchPanel ||
        request.type === MESSAGE_TYPE.saveSelection ||
        request.type === MESSAGE_TYPE.updateSnippet
      );
    }

    return (
      request.type !== MESSAGE_TYPE.saveSelection &&
      this.isTrustedExtensionPage(sender)
    );
  }

  private isTrustedContentScript(sender: MessageSenderContext): boolean {
    if (sender.senderId !== sender.extensionId || sender.tabId === undefined) {
      return false;
    }

    const sourceUrl = sender.tabUrl ?? sender.senderUrl;
    return sourceUrl !== undefined && isSupportedPageUrl(sourceUrl);
  }

  private isTrustedExtensionPage(sender: MessageSenderContext): boolean {
    if (
      sender.senderId !== sender.extensionId ||
      sender.senderUrl === undefined
    ) {
      return false;
    }

    try {
      const senderUrl = new URL(sender.senderUrl);
      return (
        senderUrl.protocol === 'chrome-extension:' &&
        senderUrl.hostname === sender.extensionId
      );
    } catch {
      return false;
    }
  }
}

function toSearchPanelItems(
  results: SearchResult[],
  labelById: ReadonlyMap<string, LabelSummary>,
  contextById: ReadonlyMap<string, ContextPresetSummary>,
): SearchPanelItem[] {
  return results.flatMap<SearchPanelItem>((result) => {
    const item = result.item;
    const source = toSearchPanelSource(item);
    const context = item.contextId
      ? contextById.get(item.contextId)
      : undefined;
    const base = {
      id: item.id,
      content: item.content,
      ...(context ? { context } : {}),
      labels: item.labelIds
        .map((labelId) => labelById.get(labelId))
        .filter((label): label is LabelSummary => label !== undefined),
      ...(source ? { source } : {}),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };

    if (result.ref.kind === 'vault' && 'pinned' in item) {
      return [
        {
          ...base,
          kind: 'vault' as const,
          pinned: item.pinned,
          ...(item.lastUsedAt !== undefined
            ? { lastUsedAt: item.lastUsedAt }
            : {}),
        },
      ];
    }
    if (result.ref.kind === 'workspace' && 'expiresAt' in item) {
      return [
        {
          ...base,
          kind: 'workspace' as const,
          expiresAt: item.expiresAt,
        },
      ];
    }
    return [];
  });
}

function toSearchPanelSource(
  item: VaultItem | WorkspaceItem,
): SearchPanelItem['source'] {
  const title = item.source?.title;
  const domain = item.source?.domain;
  const url = item.source?.url;
  if (!title && !domain && !url) {
    return undefined;
  }
  return {
    ...(title ? { title } : {}),
    ...(domain ? { domain } : {}),
    ...(url ? { url } : {}),
  };
}

function createSource(
  title: string | undefined,
  sourceUrl: string | undefined,
): VaultItem['source'] {
  if (!sourceUrl || !isSupportedPageUrl(sourceUrl)) {
    return title ? { title } : undefined;
  }

  const url = new URL(sourceUrl);
  return {
    ...(title ? { title } : {}),
    url: url.href,
    domain: url.hostname,
  };
}

function normalizeOptionalText(
  value: string | undefined,
  maximumLength: number,
): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, maximumLength);
}

function toLocalizedLabelSummary(
  label: Pick<Label, 'id' | 'name'>,
  locale: SupportedLocale,
): LabelSummary {
  return {
    id: label.id,
    name: getLocalizedLabelName(label.id, label.name, locale),
  };
}

function toContextPresetSummary(
  preset: Pick<ContextPreset, 'id' | 'name' | 'color' | 'environment'>,
  locale: SupportedLocale,
): ContextPresetSummary {
  return {
    id: preset.id,
    name: preset.environment
      ? getLocalizedEnvironmentName(preset.environment, locale)
      : preset.name,
    color: getContextPresetColor(preset),
    ...(preset.environment ? { environment: preset.environment } : {}),
  };
}

function getComparableLabelNames(
  label: Pick<Label, 'id' | 'name'>,
): string[] {
  return [label.name, ...getBuiltInLabelAliases(label.id)];
}

function restoreContextPresetRecord(
  preset: ContextPreset,
  name: string,
  color: ContextColor,
  environment: ContextEnvironment | undefined,
  now: number,
): ContextPreset {
  if (preset.environment) {
    return {
      ...preset,
      name: ENVIRONMENT_DEFINITIONS[preset.environment].canonicalContext,
      color: getContextPresetColor(preset),
      archivedAt: undefined,
      updatedAt: now,
    };
  }
  return {
    ...preset,
    name,
    color,
    ...(environment ? { environment } : {}),
    archivedAt: undefined,
    updatedAt: now,
  };
}

function isBuiltInLabelId(id: string): boolean {
  return DEFAULT_LABEL_ORDER.has(id);
}

function isBuiltInContextPreset(
  preset: Pick<ContextPreset, 'id' | 'environment'>,
): boolean {
  return (
    preset.environment !== undefined || DEFAULT_CONTEXT_ORDER.has(preset.id)
  );
}

function isSupportedPageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function toBackupSummary(
  prepared: PreparedBackup,
  expectedDataRevision: number,
): BackupSummaryData {
  let vaultItems = 0;
  let workspaceItems = 0;
  for (const record of prepared.snapshot.records) {
    if (record.kind === 'vault') {
      vaultItems += 1;
    } else {
      workspaceItems += 1;
    }
  }

  return {
    exportedAt: new Date(prepared.exportedAt).toISOString(),
    formatVersion: BACKUP_FORMAT_VERSION,
    counts: {
      labels: prepared.snapshot.labels.length,
      contexts: prepared.snapshot.contextPresets.length,
      vaultItems,
      workspaceItems,
    },
    expiredWorkspaceItems: prepared.expiredWorkspaceItems,
    expectedDataRevision,
  };
}

function createBackupFileName(exportedAt: number): string {
  const timestamp = new Date(exportedAt)
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace('T', '-')
    .replace(/\.\d{3}Z$/, 'Z');
  return `snippet-vault-${timestamp}.sv`;
}

function failure(
  code: Parameters<typeof createFailure>[0],
  message: string,
): ExtensionResponse<never> {
  return createFailure(code, message);
}

function createFailure(
  code:
    | 'BACKUP_TOO_LARGE'
    | 'CONFLICT'
    | 'INTERNAL_ERROR'
    | 'INVALID_BACKUP'
    | 'INVALID_LABEL'
    | 'INVALID_MESSAGE'
    | 'INVALID_SELECTION'
    | 'NOT_FOUND'
    | 'UNSUPPORTED_BACKUP_VERSION'
    | 'UNAUTHORIZED',
  message: string,
): ExtensionResponse<never> {
  return {
    ok: false,
    error: { code, message },
  };
}
