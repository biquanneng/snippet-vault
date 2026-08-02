// SPDX-License-Identifier: MPL-2.0

import {
  CONTEXT_COLORS,
  type ContextColor,
  type ContextEnvironment,
} from '../core/model';
import { getUiLocale } from '../i18n';
import { translate, type SupportedLocale } from '../i18n-catalog';

export const MESSAGE_TYPE = {
  archiveContextPreset: 'snippet-vault/archive-context-preset',
  archiveLabel: 'snippet-vault/archive-label',
  createContextPreset: 'snippet-vault/create-context-preset',
  createLabel: 'snippet-vault/create-label',
  createSnippet: 'snippet-vault/create-snippet',
  deleteItem: 'snippet-vault/delete-item',
  exportBackup: 'snippet-vault/export-backup',
  extendWorkspaceItem: 'snippet-vault/extend-workspace-item',
  getContextPresetManagement: 'snippet-vault/get-context-preset-management',
  getContextPresets: 'snippet-vault/get-context-presets',
  getLabelManagement: 'snippet-vault/get-label-management',
  getLabels: 'snippet-vault/get-labels',
  importBackup: 'snippet-vault/import-backup',
  inspectBackup: 'snippet-vault/inspect-backup',
  renameContextPreset: 'snippet-vault/rename-context-preset',
  renameLabel: 'snippet-vault/rename-label',
  restoreContextPreset: 'snippet-vault/restore-context-preset',
  restoreLabel: 'snippet-vault/restore-label',
  promoteWorkspaceItem: 'snippet-vault/promote-workspace-item',
  saveSelection: 'snippet-vault/save-selection',
  searchPanel: 'snippet-vault/search-panel',
  updateSnippet: 'snippet-vault/update-snippet',
} as const;

export const MAX_LABEL_NAME_LENGTH = 50;
export const MAX_CONTEXT_PRESET_NAME_LENGTH = 500;
export const MAX_SELECTION_LENGTH = 100_000;
export const MAX_SEARCH_QUERY_LENGTH = 500;
export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_PAGE = 10_000;
/** Maximum UTF-8 size for a backup sent through extension messaging. */
export const MAX_BACKUP_CONTENT_LENGTH = 25 * 1024 * 1024;

interface LocalizedRequest {
  locale?: SupportedLocale;
}

export interface GetLabelsRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.getLabels;
}

export interface GetLabelManagementRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.getLabelManagement;
}

export interface CreateLabelRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.createLabel;
  payload: {
    name: string;
  };
}

export interface RenameLabelRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.renameLabel;
  payload: {
    id: string;
    name: string;
  };
}

export interface ArchiveLabelRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.archiveLabel;
  payload: {
    id: string;
  };
}

export interface RestoreLabelRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.restoreLabel;
  payload: {
    id: string;
  };
}

export interface GetContextPresetsRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.getContextPresets;
}

export interface GetContextPresetManagementRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.getContextPresetManagement;
}

export interface CreateContextPresetRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.createContextPreset;
  payload: {
    name: string;
    color?: ContextColor;
    environment?: ContextEnvironment;
  };
}

export interface RenameContextPresetRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.renameContextPreset;
  payload: {
    id: string;
    name: string;
    color?: ContextColor;
  };
}

export interface ArchiveContextPresetRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.archiveContextPreset;
  payload: {
    id: string;
  };
}

export interface RestoreContextPresetRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.restoreContextPreset;
  payload: {
    id: string;
  };
}

export interface SaveSelectionRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.saveSelection;
  payload: {
    content: string;
    labelIds: string[];
    temporary: boolean;
    contextId?: string;
    sourceTitle?: string;
  };
}

export type SearchPanelKind = 'vault' | 'workspace';

export interface CreateSnippetRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.createSnippet;
  payload: {
    kind: SearchPanelKind;
    content: string;
    labelIds: string[];
    contextId?: string;
  };
}

export interface DeleteItemRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.deleteItem;
  payload: {
    kind: 'vault' | 'workspace';
    id: string;
  };
}

export interface ExportBackupRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.exportBackup;
}

export interface InspectBackupRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.inspectBackup;
  payload: {
    contents: string;
  };
}

export interface ImportBackupRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.importBackup;
  payload: {
    contents: string;
    expectedDataRevision: number;
  };
}

interface WorkspaceLifecycleRequest extends LocalizedRequest {
  payload: {
    id: string;
    expectedUpdatedAt: number;
  };
}

export interface ExtendWorkspaceItemRequest extends WorkspaceLifecycleRequest {
  type: typeof MESSAGE_TYPE.extendWorkspaceItem;
}

export interface PromoteWorkspaceItemRequest extends WorkspaceLifecycleRequest {
  type: typeof MESSAGE_TYPE.promoteWorkspaceItem;
}

export type UpdateSnippetContextSelection =
  | { mode: 'preserve' }
  | { mode: 'clear' }
  | {
      mode: 'set';
      contextId: string;
    };

interface UpdateSnippetRequestBase extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.updateSnippet;
  payload: {
    kind: SearchPanelKind;
    id: string;
    expectedUpdatedAt: number;
    content: string;
    labelIds: string[];
    context?: UpdateSnippetContextSelection;
  };
}

export interface UpdateVaultSnippetRequest extends UpdateSnippetRequestBase {
  payload: UpdateSnippetRequestBase['payload'] & {
    kind: 'vault';
  };
}

export interface UpdateWorkspaceSnippetRequest
  extends UpdateSnippetRequestBase {
  payload: UpdateSnippetRequestBase['payload'] & {
    kind: 'workspace';
    expiresAt?: number;
  };
}

export type UpdateSnippetRequest =
  | UpdateVaultSnippetRequest
  | UpdateWorkspaceSnippetRequest;

export interface SearchPanelRequest extends LocalizedRequest {
  type: typeof MESSAGE_TYPE.searchPanel;
  payload: {
    kind: SearchPanelKind;
    query: string;
    page: number;
    pageSize: number;
    contextId?: string;
    labelId?: string;
  };
}

export type VaultDataRequest =
  | ArchiveContextPresetRequest
  | ArchiveLabelRequest
  | CreateContextPresetRequest
  | CreateLabelRequest
  | CreateSnippetRequest
  | DeleteItemRequest
  | ExportBackupRequest
  | ExtendWorkspaceItemRequest
  | GetContextPresetManagementRequest
  | GetContextPresetsRequest
  | GetLabelManagementRequest
  | GetLabelsRequest
  | ImportBackupRequest
  | InspectBackupRequest
  | RenameContextPresetRequest
  | RenameLabelRequest
  | PromoteWorkspaceItemRequest
  | RestoreContextPresetRequest
  | RestoreLabelRequest
  | SaveSelectionRequest
  | SearchPanelRequest
  | UpdateSnippetRequest;
export type ExtensionRequest = VaultDataRequest;

export interface LabelSummary {
  id: string;
  name: string;
}

export interface LabelManagementEntry extends LabelSummary {
  usageCount: number;
  lastUsedAt?: number;
  archivedAt?: number;
  builtIn: boolean;
}

export interface LabelListData {
  labels: LabelSummary[];
}

export interface LabelManagementListData {
  labels: LabelManagementEntry[];
}

export interface CreateLabelData {
  label: LabelSummary;
  created: boolean;
  restored?: boolean;
}

export interface MutationStatusData {
  updated: boolean;
}

export interface ContextPresetSummary {
  id: string;
  name: string;
  color: ContextColor;
  environment?: ContextEnvironment;
}

export interface ContextPresetManagementEntry extends ContextPresetSummary {
  archivedAt?: number;
  builtIn: boolean;
}

export interface ContextPresetListData {
  contextPresets: ContextPresetSummary[];
}

export interface ContextPresetManagementListData {
  contextPresets: ContextPresetManagementEntry[];
}

export interface CreateContextPresetData {
  contextPreset: ContextPresetSummary;
  created: boolean;
  restored?: boolean;
}

export interface SaveSelectionData {
  id: string;
  kind: 'vault' | 'workspace';
  searchStatus: 'synchronized' | 'rebuild-required';
  labelStatus: 'updated' | 'stale';
}

export interface DeleteItemData {
  searchStatus: 'synchronized' | 'rebuild-required';
}

export interface ExportBackupData {
  contents: string;
  fileName: string;
  mimeType: 'application/json';
}

export interface BackupSummaryData {
  exportedAt: string;
  formatVersion: number;
  counts: {
    labels: number;
    contexts: number;
    vaultItems: number;
    workspaceItems: number;
  };
  expiredWorkspaceItems: number;
  expectedDataRevision: number;
}

export interface ImportBackupData extends BackupSummaryData {
  dataRevision: number;
  searchStatus: 'synchronized' | 'rebuild-required';
}

export interface ExtendWorkspaceItemData {
  id: string;
  updatedAt: number;
  expiresAt: number;
  addedDays: number;
  searchStatus: 'synchronized' | 'rebuild-required';
}

export interface PromoteWorkspaceItemData {
  id: string;
  kind: 'vault';
  updatedAt: number;
  searchStatus: 'synchronized' | 'rebuild-required';
}

export interface UpdateSnippetData {
  id: string;
  kind: SearchPanelKind;
  updatedAt: number;
  expiresAt?: number;
  searchStatus: 'synchronized' | 'rebuild-required';
  labelStatus: 'updated' | 'stale';
}

export interface SearchPanelSource {
  title?: string;
  domain?: string;
  url?: string;
}

interface SearchPanelItemBase {
  id: string;
  content: string;
  context?: ContextPresetSummary;
  labels: LabelSummary[];
  source?: SearchPanelSource;
  createdAt: number;
  updatedAt: number;
}

export type SearchPanelItem =
  | (SearchPanelItemBase & {
      kind: 'vault';
      pinned: boolean;
      lastUsedAt?: number;
    })
  | (SearchPanelItemBase & {
      kind: 'workspace';
      expiresAt: number;
    });

export interface SearchPanelPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SearchPanelData {
  kind: SearchPanelKind;
  query: string;
  items: SearchPanelItem[];
  pagination: SearchPanelPagination | null;
}

export type ExtensionErrorCode =
  | 'BACKUP_TOO_LARGE'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'INVALID_BACKUP'
  | 'INVALID_LABEL'
  | 'INVALID_MESSAGE'
  | 'INVALID_SELECTION'
  | 'NOT_FOUND'
  | 'UNSUPPORTED_BACKUP_VERSION'
  | 'UNAUTHORIZED';

export type ExtensionResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: {
        code: ExtensionErrorCode;
        message: string;
      };
    };

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    !isSupportedLocale(value.locale)
  ) {
    return false;
  }

  if (
    value.type === MESSAGE_TYPE.getLabels ||
    value.type === MESSAGE_TYPE.getLabelManagement ||
    value.type === MESSAGE_TYPE.getContextPresets ||
    value.type === MESSAGE_TYPE.getContextPresetManagement
  ) {
    return true;
  }

  if (value.type === MESSAGE_TYPE.exportBackup) {
    return value.payload === undefined;
  }

  if (value.type === MESSAGE_TYPE.inspectBackup) {
    return (
      isRecord(value.payload) &&
      Object.keys(value.payload).length === 1 &&
      isBackupContentWithinLimit(value.payload.contents)
    );
  }
  if (value.type === MESSAGE_TYPE.importBackup) {
    return (
      isRecord(value.payload) &&
      Object.keys(value.payload).length === 2 &&
      isBackupContentWithinLimit(value.payload.contents) &&
      isBoundedInteger(
        value.payload.expectedDataRevision,
        0,
        Number.MAX_SAFE_INTEGER,
      )
    );
  }

  if (value.type === MESSAGE_TYPE.deleteItem) {
    return (
      isRecord(value.payload) &&
      (value.payload.kind === 'vault' || value.payload.kind === 'workspace') &&
      typeof value.payload.id === 'string' &&
      value.payload.id.length > 0
    );
  }

  if (
    value.type === MESSAGE_TYPE.extendWorkspaceItem ||
    value.type === MESSAGE_TYPE.promoteWorkspaceItem
  ) {
    return isWorkspaceLifecyclePayload(value.payload);
  }

  if (
    value.type === MESSAGE_TYPE.archiveLabel ||
    value.type === MESSAGE_TYPE.restoreLabel ||
    value.type === MESSAGE_TYPE.archiveContextPreset ||
    value.type === MESSAGE_TYPE.restoreContextPreset
  ) {
    return (
      isRecord(value.payload) &&
      typeof value.payload.id === 'string' &&
      value.payload.id.length > 0
    );
  }

  if (
    value.type === MESSAGE_TYPE.createLabel ||
    value.type === MESSAGE_TYPE.renameLabel
  ) {
    return (
      isRecord(value.payload) &&
      (value.type === MESSAGE_TYPE.createLabel ||
        (typeof value.payload.id === 'string' && value.payload.id.length > 0)) &&
      typeof value.payload.name === 'string' &&
      value.payload.name.trim().length > 0 &&
      value.payload.name.trim().length <= MAX_LABEL_NAME_LENGTH
    );
  }

  if (
    value.type === MESSAGE_TYPE.createContextPreset ||
    value.type === MESSAGE_TYPE.renameContextPreset
  ) {
    return (
      isRecord(value.payload) &&
      (value.type === MESSAGE_TYPE.createContextPreset ||
        (typeof value.payload.id === 'string' && value.payload.id.length > 0)) &&
      typeof value.payload.name === 'string' &&
      value.payload.name.trim().length > 0 &&
      value.payload.name.trim().length <= MAX_CONTEXT_PRESET_NAME_LENGTH &&
      isContextEnvironment(value.payload.environment) &&
      isOptionalContextColor(value.payload.color)
    );
  }

  if (value.type === MESSAGE_TYPE.createSnippet) {
    return (
      isRecord(value.payload) &&
      (value.payload.kind === 'vault' ||
        value.payload.kind === 'workspace') &&
      typeof value.payload.content === 'string' &&
      isUniqueStringArray(value.payload.labelIds) &&
      isOptionalNonEmptyString(value.payload.contextId) &&
      value.payload.context === undefined
    );
  }

  if (value.type === MESSAGE_TYPE.updateSnippet) {
    return isUpdateSnippetPayload(value.payload);
  }

  if (value.type === MESSAGE_TYPE.searchPanel) {
    return isSearchPanelPayload(value.payload);
  }

  if (value.type !== MESSAGE_TYPE.saveSelection || !isRecord(value.payload)) {
    return false;
  }

  return (
    typeof value.payload.content === 'string' &&
    typeof value.payload.temporary === 'boolean' &&
    isUniqueStringArray(value.payload.labelIds) &&
    isOptionalNonEmptyString(value.payload.contextId) &&
    value.payload.context === undefined &&
    isOptionalString(value.payload.sourceTitle)
  );
}

export function hasExtensionMessageType(
  value: unknown,
): value is { type: ExtensionRequest['type'] } {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  return Object.values(MESSAGE_TYPE).includes(
    value.type as ExtensionRequest['type'],
  );
}

export function isExtensionResponse<T>(
  value: unknown,
): value is ExtensionResponse<T> {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return false;
  }

  if (value.ok) {
    return 'data' in value;
  }

  return (
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  );
}

export async function sendExtensionMessage<T>(
  request: ExtensionRequest,
): Promise<ExtensionResponse<T>> {
  const locale = getUiLocale();
  const localizedRequest = {
    ...request,
    locale,
  } as ExtensionRequest;
  try {
    const response: unknown =
      await browser.runtime.sendMessage(localizedRequest);
    if (isExtensionResponse<T>(response)) {
      return response;
    }
    return {
      ok: false,
      error: {
        code: 'INVALID_MESSAGE',
        message: translate(locale, 'errors.invalidResponse'),
      },
    };
  } catch (error: unknown) {
    console.error(
      '[SnippetVault] Extension message transport failed',
      { requestType: request.type },
      error,
    );
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: translate(locale, 'errors.noResponse'),
      },
    };
  }
}

function isSupportedLocale(value: unknown): boolean {
  return value === undefined || value === 'en' || value === 'zh_CN';
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && value.length > 0);
}

function isContextEnvironment(value: unknown): boolean {
  return (
    value === undefined ||
    value === 'development' ||
    value === 'test' ||
    value === 'staging' ||
    value === 'production'
  );
}

function isOptionalContextColor(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === 'string' &&
      CONTEXT_COLORS.includes(value as ContextColor))
  );
}

function isUniqueStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const uniqueValues = new Set<string>();
  for (const item of value) {
    if (
      typeof item !== 'string' ||
      item.length === 0 ||
      uniqueValues.has(item)
    ) {
      return false;
    }
    uniqueValues.add(item);
  }
  return true;
}

function isSearchPanelPayload(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.kind === 'vault' || value.kind === 'workspace') &&
    typeof value.query === 'string' &&
    value.query.length <= MAX_SEARCH_QUERY_LENGTH &&
    isBoundedInteger(value.page, 0, MAX_SEARCH_PAGE) &&
    isBoundedInteger(value.pageSize, 1, MAX_SEARCH_PAGE_SIZE) &&
    isOptionalNonEmptyString(value.contextId) &&
    isOptionalNonEmptyString(value.labelId)
  );
}

function isWorkspaceLifecyclePayload(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isBoundedInteger(value.expectedUpdatedAt, 0, Number.MAX_SAFE_INTEGER)
  );
}

function isBackupContentWithinLimit(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_BACKUP_CONTENT_LENGTH &&
    new TextEncoder().encode(value).byteLength <= MAX_BACKUP_CONTENT_LENGTH
  );
}

function isUpdateSnippetPayload(
  value: unknown,
): value is UpdateSnippetRequest['payload'] {
  if (
    !isRecord(value) ||
    (value.kind !== 'vault' && value.kind !== 'workspace') ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    !isBoundedInteger(
      value.expectedUpdatedAt,
      0,
      Number.MAX_SAFE_INTEGER,
    ) ||
    typeof value.content !== 'string' ||
    !isUniqueStringArray(value.labelIds) ||
    !isOptionalUpdateContextSelection(value.context)
  ) {
    return false;
  }

  if (value.kind === 'vault') {
    return value.expiresAt === undefined;
  }

  return (
    value.expiresAt === undefined ||
    isBoundedInteger(value.expiresAt, 1, Number.MAX_SAFE_INTEGER)
  );
}

function isOptionalUpdateContextSelection(
  value: unknown,
): value is UpdateSnippetContextSelection | undefined {
  if (value === undefined) {
    return true;
  }
  if (!isRecord(value) || typeof value.mode !== 'string') {
    return false;
  }

  if (value.mode === 'preserve' || value.mode === 'clear') {
    return value.contextId === undefined;
  }

  return (
    value.mode === 'set' &&
    typeof value.contextId === 'string' &&
    value.contextId.length > 0
  );
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
