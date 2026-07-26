// SPDX-License-Identifier: MPL-2.0

import type {
  Label,
  MutationReceipt,
  SearchResult,
  VaultItem,
  WorkspaceItem,
} from '../core/model';
import type {
  BrowseOptions,
  BrowsePage,
  SearchOptions,
} from '../core/vault-service';
import {
  MAX_LABEL_NAME_LENGTH,
  MAX_SELECTION_LENGTH,
  MESSAGE_TYPE,
  type CreateLabelData,
  type CreateLabelRequest,
  type ExtensionResponse,
  type LabelListData,
  type LabelSummary,
  type SaveSelectionData,
  type SaveSelectionRequest,
  type SearchPanelData,
  type SearchPanelItem,
  type SearchPanelRequest,
  type VaultDataRequest,
} from './message-contract';

export const DEFAULT_WORKSPACE_TTL_MS = 24 * 60 * 60 * 1_000;

const MAX_CONTEXT_LENGTH = 500;
const MAX_SOURCE_TITLE_LENGTH = 500;

const DEFAULT_LABELS: readonly LabelSummary[] = [
  { id: 'ak', name: 'AK' },
  { id: 'sk', name: 'SK' },
  { id: 'token', name: 'Token' },
  { id: 'password', name: '密码' },
  { id: 'note', name: '备注' },
];

const DEFAULT_LABEL_ORDER = new Map(
  DEFAULT_LABELS.map((label, index) => [label.id, index]),
);

export interface VaultMessageService {
  listLabels(): Promise<Label[]>;
  saveLabel(label: Label): Promise<MutationReceipt>;
  saveVaultItem(item: VaultItem): Promise<MutationReceipt>;
  saveWorkspaceItem(item: WorkspaceItem): Promise<MutationReceipt>;
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
}

export class VaultMessageController {
  private readonly service: VaultMessageService;
  private readonly clock: () => number;
  private readonly idFactory: () => string;
  private defaultLabelsPromise: Promise<void> | null = null;

  constructor(options: VaultMessageControllerOptions) {
    this.service = options.service;
    this.clock = options.clock ?? Date.now;
    this.idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  async handle(
    request: VaultDataRequest,
    sender: MessageSenderContext,
  ): Promise<
    ExtensionResponse<
      CreateLabelData | LabelListData | SaveSelectionData | SearchPanelData
    >
  > {
    if (!this.isAuthorizedSender(request, sender)) {
      return failure('UNAUTHORIZED', '无法验证消息来源。');
    }

    if (request.type === MESSAGE_TYPE.getLabels) {
      return this.getLabels();
    }
    if (request.type === MESSAGE_TYPE.createLabel) {
      return this.createLabel(request);
    }
    if (request.type === MESSAGE_TYPE.searchPanel) {
      return this.searchPanel(request);
    }

    return this.saveSelection(request, sender);
  }

  private async getLabels(): Promise<ExtensionResponse<LabelListData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels();

    return {
      ok: true,
      data: {
        labels: this.sortLabels(labels).map(({ id, name }) => ({ id, name })),
      },
    };
  }

  private async createLabel(
    request: CreateLabelRequest,
  ): Promise<ExtensionResponse<CreateLabelData>> {
    const name = request.payload.name.trim();
    if (!name || name.length > MAX_LABEL_NAME_LENGTH) {
      return failure(
        'INVALID_LABEL',
        `标签名称需要包含 1 至 ${MAX_LABEL_NAME_LENGTH} 个字符。`,
      );
    }

    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels();
    const existing = labels.find((label) =>
      label.name.localeCompare(name, undefined, {
        sensitivity: 'accent',
      }) === 0,
    );

    if (existing) {
      return {
        ok: true,
        data: {
          label: { id: existing.id, name: existing.name },
          created: false,
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

  private async saveSelection(
    request: SaveSelectionRequest,
    sender: MessageSenderContext,
  ): Promise<ExtensionResponse<SaveSelectionData>> {
    const validationError = this.validateSelection(request);
    if (validationError) {
      return validationError;
    }

    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels();
    const selectedLabel = request.payload.labelId
      ? labels.find((label) => label.id === request.payload.labelId)
      : undefined;

    if (!request.payload.temporary && !selectedLabel) {
      return failure('INVALID_LABEL', '请选择一个有效标签。');
    }

    const now = this.clock();
    const id = this.idFactory();
    const context = normalizeOptionalText(
      request.payload.context,
      MAX_CONTEXT_LENGTH,
    );
    const source = createSource(
      normalizeOptionalText(
        request.payload.sourceTitle,
        MAX_SOURCE_TITLE_LENGTH,
      ),
      sender.tabUrl ?? sender.senderUrl,
    );
    const baseItem = {
      id,
      content: request.payload.content,
      labelIds: selectedLabel ? [selectedLabel.id] : [],
      ...(context ? { context } : {}),
      ...(source ? { source } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const receipt = request.payload.temporary
      ? await this.service.saveWorkspaceItem({
          ...baseItem,
          expiresAt: now + DEFAULT_WORKSPACE_TTL_MS,
        })
      : await this.service.saveVaultItem({
          ...baseItem,
          pinned: false,
        });

    let labelStatus: SaveSelectionData['labelStatus'] = 'updated';
    if (selectedLabel) {
      try {
        await this.service.saveLabel({
          ...selectedLabel,
          usageCount: selectedLabel.usageCount + 1,
          lastUsedAt: now,
          updatedAt: now,
        });
      } catch {
        labelStatus = 'stale';
      }
    }

    return {
      ok: true,
      data: {
        id,
        kind: request.payload.temporary ? 'workspace' : 'vault',
        searchStatus: receipt.searchStatus,
        labelStatus,
      },
    };
  }

  private async searchPanel(
    request: SearchPanelRequest,
  ): Promise<ExtensionResponse<SearchPanelData>> {
    await this.ensureDefaultLabels();
    const labels = await this.service.listLabels();
    const labelById = new Map(
      labels.map((label) => [
        label.id,
        { id: label.id, name: label.name },
      ]),
    );
    const query = request.payload.query.trim();

    if (query) {
      const results = await this.service.search(query, {
        kind: request.payload.kind,
        limit: 50,
      });
      return {
        ok: true,
        data: {
          kind: request.payload.kind,
          query,
          items: toSearchPanelItems(results, labelById),
          pagination: null,
        },
      };
    }

    const page = await this.service.browse(request.payload.kind, {
      offset: request.payload.page * request.payload.pageSize,
      limit: request.payload.pageSize,
    });
    return {
      ok: true,
      data: {
        kind: request.payload.kind,
        query: '',
        items: toSearchPanelItems(page.results, labelById),
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
  ): ExtensionResponse<never> | null {
    const { content, context, sourceTitle } = request.payload;
    if (!content.trim() || content.length > MAX_SELECTION_LENGTH) {
      return failure(
        'INVALID_SELECTION',
        `请选择 1 至 ${MAX_SELECTION_LENGTH.toLocaleString()} 个字符。`,
      );
    }
    if (context && context.trim().length > MAX_CONTEXT_LENGTH) {
      return failure('INVALID_MESSAGE', '说明内容过长。');
    }
    if (sourceTitle && sourceTitle.trim().length > MAX_SOURCE_TITLE_LENGTH) {
      return failure('INVALID_MESSAGE', '页面标题过长。');
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

  private async createMissingDefaultLabels(): Promise<void> {
    const existing = await this.service.listLabels();
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

  private sortLabels(labels: Label[]): Label[] {
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
      return left.name.localeCompare(right.name);
    });
  }

  private isAuthorizedSender(
    request: VaultDataRequest,
    sender: MessageSenderContext,
  ): boolean {
    if (this.isTrustedContentScript(sender)) {
      return true;
    }

    return (
      request.type === MESSAGE_TYPE.searchPanel &&
      this.isTrustedExtensionPage(sender)
    );
  }

  private isTrustedContentScript(sender: MessageSenderContext): boolean {
    if (
      sender.senderId !== sender.extensionId ||
      sender.tabId === undefined
    ) {
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
): SearchPanelItem[] {
  return results.flatMap<SearchPanelItem>((result) => {
    const item = result.item;
    const source = toSearchPanelSource(item);
    const base = {
      id: item.id,
      content: item.content,
      ...(item.context ? { context: item.context } : {}),
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

function isSupportedPageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function failure(
  code: Parameters<typeof createFailure>[0],
  message: string,
): ExtensionResponse<never> {
  return createFailure(code, message);
}

function createFailure(
  code:
    | 'INVALID_LABEL'
    | 'INVALID_MESSAGE'
    | 'INVALID_SELECTION'
    | 'UNAUTHORIZED',
  message: string,
): ExtensionResponse<never> {
  return {
    ok: false,
    error: { code, message },
  };
}
