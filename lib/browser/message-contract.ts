// SPDX-License-Identifier: MPL-2.0

export const MESSAGE_TYPE = {
  createLabel: 'snippet-vault/create-label',
  getLabels: 'snippet-vault/get-labels',
  saveSelection: 'snippet-vault/save-selection',
  searchPanel: 'snippet-vault/search-panel',
} as const;

export const MAX_LABEL_NAME_LENGTH = 50;
export const MAX_SELECTION_LENGTH = 100_000;
export const MAX_SEARCH_QUERY_LENGTH = 500;
export const MAX_SEARCH_PAGE_SIZE = 50;
export const MAX_SEARCH_PAGE = 10_000;

export interface GetLabelsRequest {
  type: typeof MESSAGE_TYPE.getLabels;
}

export interface CreateLabelRequest {
  type: typeof MESSAGE_TYPE.createLabel;
  payload: {
    name: string;
  };
}

export interface SaveSelectionRequest {
  type: typeof MESSAGE_TYPE.saveSelection;
  payload: {
    content: string;
    labelId?: string;
    temporary: boolean;
    context?: string;
    sourceTitle?: string;
  };
}

export type SearchPanelKind = 'vault' | 'workspace';

export interface SearchPanelRequest {
  type: typeof MESSAGE_TYPE.searchPanel;
  payload: {
    kind: SearchPanelKind;
    query: string;
    page: number;
    pageSize: number;
  };
}

export type VaultDataRequest =
  | CreateLabelRequest
  | GetLabelsRequest
  | SaveSelectionRequest
  | SearchPanelRequest;
export type ExtensionRequest = VaultDataRequest;

export interface LabelSummary {
  id: string;
  name: string;
}

export interface LabelListData {
  labels: LabelSummary[];
}

export interface CreateLabelData {
  label: LabelSummary;
  created: boolean;
}

export interface SaveSelectionData {
  id: string;
  kind: 'vault' | 'workspace';
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
  context?: string;
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
  | 'INTERNAL_ERROR'
  | 'INVALID_LABEL'
  | 'INVALID_MESSAGE'
  | 'INVALID_SELECTION'
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
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (value.type === MESSAGE_TYPE.getLabels) {
    return true;
  }

  if (value.type === MESSAGE_TYPE.createLabel) {
    return (
      isRecord(value.payload) &&
      typeof value.payload.name === 'string' &&
      value.payload.name.trim().length > 0 &&
      value.payload.name.trim().length <= MAX_LABEL_NAME_LENGTH
    );
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
    isOptionalString(value.payload.labelId) &&
    isOptionalString(value.payload.context) &&
    isOptionalString(value.payload.sourceTitle)
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
  try {
    const response: unknown = await browser.runtime.sendMessage(request);
    if (isExtensionResponse<T>(response)) {
      return response;
    }
    return {
      ok: false,
      error: {
        code: 'INVALID_MESSAGE',
        message: '扩展返回了无法识别的响应。',
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
        message: '扩展暂时没有响应，请重试。',
      },
    };
  }
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
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
    isBoundedInteger(value.pageSize, 1, MAX_SEARCH_PAGE_SIZE)
  );
}

function isBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
