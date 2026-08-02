// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  parseBackup,
  serializeBackup,
} from '../backup-format';
import type {
  ConditionalMutationReceipt,
  ContextPreset,
  Label,
  MutationReceipt,
  SearchResult,
  VaultSnapshot,
  VaultItem,
  WorkspaceItem,
} from '../core/model';
import type { BrowsePage } from '../core/vault-service';
import {
  DEFAULT_WORKSPACE_TTL_MS,
  VaultMessageController,
  type VaultMessageService,
} from './vault-message-controller';

class FakeVaultService implements VaultMessageService {
  readonly labels: Label[] = [];
  readonly contextPresets: ContextPreset[] = [];
  readonly vaultItems: VaultItem[] = [];
  readonly workspaceItems: WorkspaceItem[] = [];
  afterSaveVaultItem?: () => void | Promise<void>;
  dataRevision = 1;

  async exportSnapshot(): Promise<{
    snapshot: VaultSnapshot;
    dataRevision: number;
  }> {
    return {
      snapshot: {
        labels: structuredClone(this.labels),
        contextPresets: structuredClone(this.contextPresets),
        records: [
          ...this.vaultItems.map((item) => ({
            kind: 'vault' as const,
            item: structuredClone(item),
          })),
          ...this.workspaceItems.map((item) => ({
            kind: 'workspace' as const,
            item: structuredClone(item),
          })),
        ],
      },
      dataRevision: this.dataRevision,
    };
  }

  async getDataRevision(): Promise<number> {
    return this.dataRevision;
  }

  async replaceSnapshot(
    snapshot: VaultSnapshot,
    expectedDataRevision: number,
  ): Promise<ConditionalMutationReceipt> {
    if (expectedDataRevision !== this.dataRevision) {
      return {
        ...conditionalReceipt('conflict'),
        dataRevision: this.dataRevision,
      };
    }

    this.labels.splice(0, this.labels.length, ...structuredClone(snapshot.labels));
    this.contextPresets.splice(
      0,
      this.contextPresets.length,
      ...structuredClone(snapshot.contextPresets),
    );
    this.vaultItems.splice(
      0,
      this.vaultItems.length,
      ...snapshot.records
        .filter((record) => record.kind === 'vault')
        .map((record) => structuredClone(record.item as VaultItem)),
    );
    this.workspaceItems.splice(
      0,
      this.workspaceItems.length,
      ...snapshot.records
        .filter((record) => record.kind === 'workspace')
        .map((record) => structuredClone(record.item as WorkspaceItem)),
    );
    this.dataRevision += 1;
    return {
      changed: true,
      dataRevision: this.dataRevision,
      outcome: 'updated',
      searchStatus: 'synchronized',
    };
  }

  async listLabels(
    options?: { includeArchived?: boolean },
  ): Promise<Label[]> {
    return structuredClone(
      options?.includeArchived
        ? this.labels
        : this.labels.filter((label) => label.archivedAt === undefined),
    );
  }

  async listContextPresets(
    options?: { includeArchived?: boolean },
  ): Promise<ContextPreset[]> {
    return structuredClone(
      options?.includeArchived
        ? this.contextPresets
        : this.contextPresets.filter(
            (preset) => preset.archivedAt === undefined,
          ),
    );
  }

  async saveLabel(label: Label): Promise<MutationReceipt> {
    const existing = this.labels.findIndex((candidate) => candidate.id === label.id);
    if (existing === -1) {
      this.labels.push(structuredClone(label));
    } else {
      this.labels[existing] = structuredClone(label);
    }
    return synchronizedReceipt();
  }

  async saveContextPreset(preset: ContextPreset): Promise<MutationReceipt> {
    const existing = this.contextPresets.findIndex(
      (candidate) => candidate.id === preset.id,
    );
    if (existing === -1) {
      this.contextPresets.push(structuredClone(preset));
    } else {
      this.contextPresets[existing] = structuredClone(preset);
    }
    return synchronizedReceipt();
  }

  async touchLabelUsage(id: string, time: number): Promise<MutationReceipt> {
    const existing = this.labels.findIndex((candidate) => candidate.id === id);
    if (existing !== -1) {
      const label = this.labels[existing];
      this.labels[existing] = {
        ...label,
        usageCount: label.usageCount + 1,
        lastUsedAt: time,
        updatedAt: time,
      };
    }
    return synchronizedReceipt();
  }

  async saveVaultItem(item: VaultItem): Promise<MutationReceipt> {
    const existing = this.vaultItems.findIndex(
      (candidate) => candidate.id === item.id,
    );
    if (existing === -1) {
      this.vaultItems.push(structuredClone(item));
    } else {
      this.vaultItems[existing] = structuredClone(item);
    }
    await this.afterSaveVaultItem?.();
    return synchronizedReceipt();
  }

  async saveWorkspaceItem(item: WorkspaceItem): Promise<MutationReceipt> {
    const existing = this.workspaceItems.findIndex(
      (candidate) => candidate.id === item.id,
    );
    if (existing === -1) {
      this.workspaceItems.push(structuredClone(item));
    } else {
      this.workspaceItems[existing] = structuredClone(item);
    }
    return synchronizedReceipt();
  }

  async saveVaultItemIfUnchanged(
    item: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt> {
    const existing = this.vaultItems.find((candidate) => candidate.id === item.id);
    if (!existing) {
      return conditionalReceipt('not-found');
    }
    if (existing.updatedAt !== expectedUpdatedAt) {
      return conditionalReceipt('conflict');
    }

    const index = this.vaultItems.findIndex((candidate) => candidate.id === item.id);
    this.vaultItems[index] = structuredClone(item);
    await this.afterSaveVaultItem?.();
    return conditionalReceipt('updated');
  }

  async saveWorkspaceItemIfUnchanged(
    item: WorkspaceItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt> {
    const existing = this.workspaceItems.find(
      (candidate) => candidate.id === item.id,
    );
    if (!existing) {
      return conditionalReceipt('not-found');
    }
    if (existing.updatedAt !== expectedUpdatedAt) {
      return conditionalReceipt('conflict');
    }

    const index = this.workspaceItems.findIndex(
      (candidate) => candidate.id === item.id,
    );
    this.workspaceItems[index] = structuredClone(item);
    return conditionalReceipt('updated');
  }

  async promoteWorkspaceItem(
    workspaceId: string,
    vaultItem: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationReceipt> {
    const existing = this.workspaceItems.find(
      (candidate) => candidate.id === workspaceId,
    );
    if (!existing) {
      return conditionalReceipt('not-found');
    }
    if (existing.updatedAt !== expectedUpdatedAt) {
      return conditionalReceipt('conflict');
    }

    const index = this.workspaceItems.findIndex(
      (candidate) => candidate.id === workspaceId,
    );
    this.workspaceItems.splice(index, 1);
    this.vaultItems.push(structuredClone(vaultItem));
    return conditionalReceipt('updated');
  }

  async deleteItem(
    reference: { kind: 'vault' | 'workspace'; id: string },
  ): Promise<MutationReceipt> {
    if (reference.kind === 'vault') {
      const index = this.vaultItems.findIndex((i) => i.id === reference.id);
      if (index !== -1) {
        this.vaultItems.splice(index, 1);
        return synchronizedReceipt();
      }
    } else {
      const index = this.workspaceItems.findIndex((i) => i.id === reference.id);
      if (index !== -1) {
        this.workspaceItems.splice(index, 1);
        return synchronizedReceipt();
      }
    }
    return synchronizedReceipt();
  }

  async getItem(
    reference: { kind: 'vault' | 'workspace'; id: string },
  ): Promise<
    | { kind: 'vault'; item: VaultItem }
    | { kind: 'workspace'; item: WorkspaceItem }
    | null
  > {
    if (reference.kind === 'vault') {
      const item = this.vaultItems.find((candidate) => candidate.id === reference.id);
      return item
        ? {
            kind: 'vault',
            item: structuredClone(item),
          }
        : null;
    }

    const item = this.workspaceItems.find(
      (candidate) => candidate.id === reference.id,
    );
    return item
      ? {
          kind: 'workspace',
          item: structuredClone(item),
        }
      : null;
  }

  async search(
    _query: string,
    options: {
      kind?: 'vault' | 'workspace';
      limit?: number;
      contextId?: string;
      labelId?: string;
    },
  ): Promise<SearchResult[]> {
    return this.results(options.kind, options).slice(0, options.limit);
  }

  async browse(
    kind: 'vault' | 'workspace',
    options: {
      offset?: number;
      limit?: number;
      contextId?: string;
      labelId?: string;
    },
  ): Promise<BrowsePage> {
    const records = this.results(kind, options);
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const results = records.slice(offset, offset + limit);
    return {
      results,
      total: records.length,
      offset,
      limit,
      hasMore: offset + results.length < records.length,
    };
  }

  private results(
    kind?: 'vault' | 'workspace',
    filters: { contextId?: string; labelId?: string } = {},
  ): SearchResult[] {
    const vaultResults = this.vaultItems.map(
      (item): SearchResult => ({
        ref: { kind: 'vault', id: item.id },
        item,
      }),
    );
    const workspaceResults = this.workspaceItems.map(
      (item): SearchResult => ({
        ref: { kind: 'workspace', id: item.id },
        item,
      }),
    );
    return [...vaultResults, ...workspaceResults].filter(
      (result) =>
        (!kind || result.ref.kind === kind) &&
        (!filters.contextId || result.item.contextId === filters.contextId) &&
        (!filters.labelId || result.item.labelIds.includes(filters.labelId)),
    );
  }
}

const trustedSender = {
  extensionId: 'extension-id',
  senderId: 'extension-id',
  tabId: 7,
  senderUrl: 'https://console.example.com/project/alpha',
  tabUrl: 'https://console.example.com/project/alpha',
};

const trustedExtensionPageSender = {
  extensionId: 'extension-id',
  senderId: 'extension-id',
  senderUrl: 'chrome-extension://extension-id/sidepanel.html',
};

function synchronizedReceipt(): MutationReceipt {
  return {
    changed: true,
    dataRevision: 1,
    searchStatus: 'synchronized',
  };
}

function conditionalReceipt(
  outcome: ConditionalMutationReceipt['outcome'],
): ConditionalMutationReceipt {
  return {
    changed: outcome === 'updated',
    dataRevision: 1,
    outcome,
    searchStatus: 'synchronized',
  };
}

describe('VaultMessageController', () => {
  it('exports a complete plaintext backup from an extension page', async () => {
    const service = new FakeVaultService();
    service.vaultItems.push({
      id: 'vault-export',
      content: 'portable secret',
      labelIds: ['token'],
      pinned: false,
      createdAt: 100,
      updatedAt: 100,
    });
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/export-backup',
      },
      trustedExtensionPageSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        fileName: 'snippet-vault-19700101-000001Z.sv',
        mimeType: 'application/json',
      },
    });
    if (!response.ok || !('contents' in response.data)) {
      throw new Error('Expected a backup export');
    }
    const parsed = parseBackup(response.data.contents);
    expect(parsed.exportedAt).toBe(1_000);
    expect(parsed.snapshot.labels).toHaveLength(20);
    expect(parsed.snapshot.contextPresets).toHaveLength(4);
    expect(parsed.snapshot.records).toContainEqual({
      kind: 'vault',
      item: service.vaultItems[0],
    });
  });

  it('previews and atomically replaces data while skipping expired workspace items', async () => {
    const sourceService = new FakeVaultService();
    sourceService.vaultItems.push({
      id: 'replacement-vault',
      content: 'replacement secret',
      labelIds: ['token'],
      pinned: false,
      createdAt: 100,
      updatedAt: 100,
    });
    sourceService.workspaceItems.push(
      {
        id: 'active-workspace',
        content: 'active temporary secret',
        labelIds: [],
        createdAt: 100,
        updatedAt: 100,
        expiresAt: 1_001,
      },
      {
        id: 'expired-workspace',
        content: 'expired temporary secret',
        labelIds: [],
        createdAt: 100,
        updatedAt: 100,
        expiresAt: 1_000,
      },
    );
    const sourceController = createController(sourceService);
    const exported = await sourceController.handle(
      {
        type: 'snippet-vault/export-backup',
      },
      trustedExtensionPageSender,
    );
    if (!exported.ok || !('contents' in exported.data)) {
      throw new Error('Expected a backup export');
    }

    const targetService = new FakeVaultService();
    targetService.dataRevision = 9;
    targetService.vaultItems.push({
      id: 'old-vault',
      content: 'old local data',
      labelIds: [],
      pinned: false,
      createdAt: 50,
      updatedAt: 50,
    });
    const targetController = createController(targetService);
    const preview = await targetController.handle(
      {
        type: 'snippet-vault/inspect-backup',
        payload: { contents: exported.data.contents },
      },
      trustedExtensionPageSender,
    );

    expect(preview).toEqual({
      ok: true,
      data: {
        exportedAt: new Date(1_000).toISOString(),
        formatVersion: 1,
        counts: {
          labels: 20,
          contexts: 4,
          vaultItems: 1,
          workspaceItems: 1,
        },
        expiredWorkspaceItems: 1,
        expectedDataRevision: 9,
      },
    });

    targetService.dataRevision = 10;
    await expect(
      targetController.handle(
        {
          type: 'snippet-vault/import-backup',
          payload: {
            contents: exported.data.contents,
            expectedDataRevision: 9,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
    expect(targetService.vaultItems).toHaveLength(1);
    expect(targetService.vaultItems[0]?.id).toBe('old-vault');

    const refreshedPreview = await targetController.handle(
      {
        type: 'snippet-vault/inspect-backup',
        payload: { contents: exported.data.contents },
      },
      trustedExtensionPageSender,
    );
    if (!refreshedPreview.ok || !('expectedDataRevision' in refreshedPreview.data)) {
      throw new Error('Expected a backup preview');
    }
    await expect(
      targetController.handle(
        {
          type: 'snippet-vault/import-backup',
          payload: {
            contents: exported.data.contents,
            expectedDataRevision: refreshedPreview.data.expectedDataRevision,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        dataRevision: 11,
        searchStatus: 'synchronized',
      },
    });
    expect(targetService.vaultItems.map((item) => item.id)).toEqual([
      'replacement-vault',
    ]);
    expect(targetService.workspaceItems.map((item) => item.id)).toEqual([
      'active-workspace',
    ]);
  });

  it('rejects every backup operation from a content script', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);
    const snapshot = await service.exportSnapshot();
    const contents = serializeBackup(snapshot.snapshot, { exportedAt: 1_000 });

    for (const request of [
      {
        type: 'snippet-vault/export-backup' as const,
      },
      {
        type: 'snippet-vault/inspect-backup' as const,
        payload: { contents },
      },
      {
        type: 'snippet-vault/import-backup' as const,
        payload: { contents, expectedDataRevision: 1 },
      },
    ]) {
      await expect(controller.handle(request, trustedSender)).resolves.toMatchObject({
        ok: false,
        error: { code: 'UNAUTHORIZED' },
      });
    }
  });

  it('creates and returns the default labels', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      { type: 'snippet-vault/get-labels' },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        labels: [
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
        ],
      },
    });
    expect(service.labels).toHaveLength(20);
    expect(service.labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ak', name: 'Access Key' }),
        expect.objectContaining({ id: 'sk', name: 'Secret Key' }),
        expect.objectContaining({
          id: 'client-secret',
          name: 'Client Secret',
        }),
      ]),
    );
  });

  it('localizes legacy built-in labels without rewriting stored label data', async () => {
    const service = new FakeVaultService();
    service.labels.push(
      {
        id: 'ak',
        name: 'AK',
        usageCount: 0,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: 'sk',
        name: 'SK',
        usageCount: 0,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: 'password',
        name: '密码',
        usageCount: 0,
        createdAt: 100,
        updatedAt: 100,
      },
      {
        id: 'note',
        name: '备注',
        usageCount: 0,
        createdAt: 100,
        updatedAt: 100,
      },
    );
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/get-labels',
        locale: 'zh_CN',
      },
      trustedSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        labels: expect.arrayContaining([
          { id: 'ak', name: 'Access Key' },
          { id: 'sk', name: 'Secret Key' },
          { id: 'password', name: '密码' },
          { id: 'note', name: '备注' },
        ]),
      },
    });
    expect(service.labels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ak', name: 'AK' }),
        expect.objectContaining({ id: 'sk', name: 'SK' }),
        expect.objectContaining({ id: 'password', name: '密码' }),
        expect.objectContaining({ id: 'note', name: '备注' }),
      ]),
    );
  });

  it('orders recently used labels before historically frequent labels', async () => {
    const service = new FakeVaultService();
    service.labels.push(
      {
        id: 'frequent',
        name: 'Frequent',
        usageCount: 100,
        lastUsedAt: 500,
        createdAt: 100,
        updatedAt: 500,
      },
      {
        id: 'recent',
        name: 'Recent',
        usageCount: 1,
        lastUsedAt: 900,
        createdAt: 100,
        updatedAt: 900,
      },
    );
    const controller = createController(service);

    const response = await controller.handle(
      { type: 'snippet-vault/get-labels' },
      trustedSender,
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      throw new Error('Expected label loading to succeed.');
    }
    if (!('labels' in response.data)) {
      throw new Error('Expected a label list response.');
    }
    expect(response.data.labels.slice(0, 2)).toEqual([
      { id: 'recent', name: 'Recent' },
      { id: 'frequent', name: 'Frequent' },
    ]);
  });

  it('creates a custom label and returns its persisted identity', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/create-label',
        payload: { name: '  Database  ' },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        label: {
          id: 'custom:generated-id',
          name: 'Database',
        },
        created: true,
      },
    });
    expect(service.labels).toContainEqual({
      id: 'custom:generated-id',
      name: 'Database',
      usageCount: 0,
      createdAt: 1_000,
      updatedAt: 1_000,
    });
  });

  it('uses a newly created label in the next selection save', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    await controller.handle(
      {
        type: 'snippet-vault/create-label',
        payload: { name: 'Database' },
      },
      trustedSender,
    );
    const response = await controller.handle(
      {
        type: 'snippet-vault/save-selection',
        payload: {
          content: 'postgres://localhost/snippets',
          labelIds: ['custom:generated-id'],
          temporary: false,
        },
      },
      trustedSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: { kind: 'vault' },
    });
    expect(service.vaultItems[0]).toMatchObject({
      content: 'postgres://localhost/snippets',
      labelIds: ['custom:generated-id'],
    });
    expect(
      service.labels.find(
        (label) => label.id === 'custom:generated-id',
      ),
    ).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });
  });

  it('selects an existing label name without creating a duplicate', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/create-label',
        payload: { name: ' token ' },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        label: { id: 'token', name: 'Token' },
        created: false,
      },
    });
    expect(
      service.labels.filter((label) => label.name === 'Token'),
    ).toHaveLength(1);
  });

  it('recognizes legacy shorthand for a full built-in label name', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/create-label',
        locale: 'en',
        payload: { name: 'AK' },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        label: { id: 'ak', name: 'Access Key' },
        created: false,
      },
    });
    expect(
      service.labels.filter((label) => label.id === 'ak'),
    ).toHaveLength(1);
  });

  it('restricts label management to trusted extension pages and protects built-ins from rename', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    await expect(
      controller.handle(
        { type: 'snippet-vault/get-label-management' },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/rename-label',
          payload: { id: 'token', name: 'Credential' },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_LABEL' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/archive-label',
          payload: { id: 'token' },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: { updated: true },
    });

    const labelsResponse = await controller.handle(
      { type: 'snippet-vault/get-labels' },
      trustedSender,
    );
    expect(labelsResponse).toMatchObject({
      ok: true,
      data: {
        labels: expect.not.arrayContaining([
          { id: 'token', name: 'Token' },
        ]),
      },
    });
  });

  it('restores archived labels on create and still resolves archived labels in history', async () => {
    const service = new FakeVaultService();
    service.labels.push({
      id: 'custom:archived',
      name: 'Database',
      usageCount: 2,
      archivedAt: 900,
      createdAt: 100,
      updatedAt: 900,
    });
    service.vaultItems.push({
      id: 'history-item',
      content: 'archived label history',
      labelIds: ['custom:archived'],
      pinned: false,
      createdAt: 100,
      updatedAt: 100,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/search-panel',
          payload: {
            kind: 'vault',
            query: '',
            page: 0,
            pageSize: 10,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        items: [
          {
            id: 'history-item',
            labels: [{ id: 'custom:archived', name: 'Database' }],
          },
        ],
      },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-label',
          payload: { name: 'Database' },
        },
        trustedSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        label: { id: 'custom:archived', name: 'Database' },
        created: false,
        restored: true,
      },
    });

    const activeLabels = await controller.handle(
      { type: 'snippet-vault/get-labels' },
      trustedSender,
    );
    expect(activeLabels).toMatchObject({
      ok: true,
      data: {
        labels: expect.arrayContaining([
          { id: 'custom:archived', name: 'Database' },
        ]),
      },
    });
  });

  it('saves the exact selected Markdown with optional labels, context ID and trusted page source', async () => {
    const service = new FakeVaultService();
    service.contextPresets.push({
      id: 'context:meowdex-production',
      name: 'meowdex production',
      color: 'slate',
      createdAt: 100,
      updatedAt: 100,
    });
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/save-selection',
        payload: {
          content: '  **sk-live-preserve-whitespace**  ',
          labelIds: ['token', 'client-id'],
          contextId: 'context:meowdex-production',
          sourceTitle: '  Credentials  ',
          temporary: false,
        },
      },
      trustedSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        id: 'generated-id',
        kind: 'vault',
        searchStatus: 'synchronized',
      },
    });
    expect(service.vaultItems).toEqual([
      {
        id: 'generated-id',
        content: '  **sk-live-preserve-whitespace**  ',
        labelIds: ['token', 'client-id'],
        contextId: 'context:meowdex-production',
        source: {
          title: 'Credentials',
          url: 'https://console.example.com/project/alpha',
          domain: 'console.example.com',
        },
        pinned: false,
        createdAt: 1_000,
        updatedAt: 1_000,
      },
    ]);
    expect(service.labels.find((label) => label.id === 'token')).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });
    expect(
      service.labels.find((label) => label.id === 'client-id'),
    ).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });
  });

  it('saves temporary selections with the default expiry', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/save-selection',
        payload: {
          content: 'one-time-code',
          labelIds: [],
          temporary: true,
        },
      },
      trustedSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        id: 'generated-id',
        kind: 'workspace',
      },
    });
    expect(service.workspaceItems[0]).toMatchObject({
      content: 'one-time-code',
      labelIds: [],
      createdAt: 1_000,
      updatedAt: 1_000,
      expiresAt: 1_000 + DEFAULT_WORKSPACE_TTL_MS,
    });
    expect(DEFAULT_WORKSPACE_TTL_MS).toBe(
      7 * 24 * 60 * 60 * 1_000,
    );
  });

  it('uses the configured expiry for newly created workspace records', async () => {
    const service = new FakeVaultService();
    const controller = new VaultMessageController({
      service,
      clock: () => 1_000,
      idFactory: () => 'configured-expiry-id',
      workspaceExpiryDaysProvider: () => Promise.resolve(3),
    });

    await controller.handle(
      {
        type: 'snippet-vault/create-snippet',
        payload: {
          kind: 'workspace',
          content: 'short-lived deployment token',
          labelIds: ['token'],
        },
      },
      trustedExtensionPageSender,
    );

    expect(service.workspaceItems[0]?.expiresAt).toBe(
      1_000 + 3 * 24 * 60 * 60 * 1_000,
    );
  });

  it('returns default context presets and supports custom context CRUD from trusted extension pages', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    await expect(
      controller.handle(
        { type: 'snippet-vault/get-context-preset-management' },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        { type: 'snippet-vault/get-context-presets' },
        trustedSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        contextPresets: [
          {
            id: 'environment:development',
            name: 'Development',
            environment: 'development',
            color: 'blue',
          },
          {
            id: 'environment:test',
            name: 'Test',
            environment: 'test',
            color: 'cyan',
          },
          {
            id: 'environment:staging',
            name: 'Staging',
            environment: 'staging',
            color: 'amber',
          },
          {
            id: 'environment:production',
            name: 'Production',
            environment: 'production',
            color: 'red',
          },
        ],
      },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-context-preset',
          payload: { name: '  Shared QA  ', color: 'purple' },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
          contextPreset: {
            id: 'context:generated-id',
            name: 'Shared QA',
            color: 'purple',
          },
        created: true,
      },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/rename-context-preset',
          payload: {
            id: 'environment:development',
            name: '开发',
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_MESSAGE' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/rename-context-preset',
          payload: {
            id: 'context:generated-id',
            name: '  Shared QA Updated  ',
            color: 'green',
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: { updated: true },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/archive-context-preset',
          payload: { id: 'context:generated-id' },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: { updated: true },
    });

    const activeAfterArchive = await controller.handle(
      { type: 'snippet-vault/get-context-presets' },
      trustedSender,
    );
    expect(activeAfterArchive).toMatchObject({
      ok: true,
      data: {
        contextPresets: expect.not.arrayContaining([
          { id: 'context:generated-id', name: 'Shared QA Updated' },
        ]),
      },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/restore-context-preset',
          payload: { id: 'context:generated-id' },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: { updated: true },
    });
  });

  it('stores stable context IDs for built-in environments', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'vault',
            content: 'token with preset context',
            labelIds: ['token'],
            contextId: 'environment:production',
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        kind: 'vault',
      },
    });

    expect(service.vaultItems[0]).toMatchObject({
      contextId: 'environment:production',
    });
  });

  it('keeps custom context identity stable when the preset changes', async () => {
    const service = new FakeVaultService();
    service.contextPresets.push({
      id: 'context:meowdex',
      name: 'meowdex',
      color: 'purple',
      createdAt: 100,
      updatedAt: 100,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'workspace',
            content: 'temporary deploy note',
            labelIds: [],
            contextId: 'context:meowdex',
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({ ok: true });

    expect(service.workspaceItems[0]).toMatchObject({
      contextId: 'context:meowdex',
    });

    await controller.handle(
      {
        type: 'snippet-vault/rename-context-preset',
        payload: {
          id: 'context:meowdex',
          name: 'meowdex production',
          color: 'red',
        },
      },
      trustedExtensionPageSender,
    );

    expect(
      service.contextPresets.find(
        (preset) => preset.id === 'context:meowdex',
      ),
    ).toMatchObject({
      name: 'meowdex production',
      color: 'red',
    });
    expect(service.workspaceItems[0]).toMatchObject({
      contextId: 'context:meowdex',
    });
  });

  it('touches label usage atomically without overwriting a concurrent rename', async () => {
    const service = new FakeVaultService();
    service.labels.push({
      id: 'custom:renamed',
      name: 'Original',
      usageCount: 0,
      createdAt: 100,
      updatedAt: 100,
    });
    service.afterSaveVaultItem = () => {
      const index = service.labels.findIndex(
        (label) => label.id === 'custom:renamed',
      );
      service.labels[index] = {
        ...service.labels[index],
        name: 'Renamed Elsewhere',
        updatedAt: 1_001,
      };
    };
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'value',
            labelIds: ['custom:renamed'],
            temporary: false,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: { labelStatus: 'updated' },
    });

    expect(
      service.labels.find((label) => label.id === 'custom:renamed'),
    ).toMatchObject({
      name: 'Renamed Elsewhere',
      usageCount: 1,
      lastUsedAt: 1_000,
    });
  });

  it('returns a label-enriched paginated vault browse', async () => {
    const service = new FakeVaultService();
    service.labels.push({
      id: 'token',
      name: 'Token',
      usageCount: 0,
      createdAt: 100,
      updatedAt: 100,
    });
    service.vaultItems.push(
      {
        id: 'first',
        content: 'first-secret',
        labelIds: ['token'],
        source: {
          title: 'Console',
          domain: 'console.example.com',
        },
        pinned: true,
        createdAt: 100,
        updatedAt: 200,
      },
      {
        id: 'second',
        content: 'second-secret',
        labelIds: [],
        pinned: false,
        createdAt: 100,
        updatedAt: 100,
      },
    );
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/search-panel',
        payload: {
          kind: 'vault',
          query: '',
          page: 0,
          pageSize: 1,
        },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        kind: 'vault',
        query: '',
        items: [
          {
            kind: 'vault',
            id: 'first',
            content: 'first-secret',
            labels: [{ id: 'token', name: 'Token' }],
            source: {
              title: 'Console',
              domain: 'console.example.com',
            },
            pinned: true,
            createdAt: 100,
            updatedAt: 200,
          },
        ],
        pagination: {
          page: 0,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      },
    });
  });

  it('returns flat workspace search results without browse pagination', async () => {
    const service = new FakeVaultService();
    service.contextPresets.push({
      id: 'context:deployment',
      name: 'deployment',
      color: 'green',
      createdAt: 100,
      updatedAt: 100,
    });
    service.workspaceItems.push({
      id: 'temporary',
      content: 'one-time-code',
      labelIds: [],
      contextId: 'context:deployment',
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 2_000,
    });
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/search-panel',
        payload: {
          kind: 'workspace',
          query: '  one time  ',
          page: 4,
          pageSize: 12,
        },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        kind: 'workspace',
        query: 'one time',
        items: [
          {
            kind: 'workspace',
            id: 'temporary',
            content: 'one-time-code',
            context: {
              id: 'context:deployment',
              name: 'deployment',
              color: 'green',
            },
            labels: [],
            createdAt: 100,
            updatedAt: 100,
            expiresAt: 2_000,
          },
        ],
        pagination: null,
      },
    });
  });

  it('applies exact context and label filters before browse pagination', async () => {
    const service = new FakeVaultService();
    service.labels.push({
      id: 'token',
      name: 'Token',
      usageCount: 0,
      createdAt: 100,
      updatedAt: 100,
    });
    service.contextPresets.push({
      id: 'environment:production',
      name: '生产环境',
      color: 'red',
      environment: 'production',
      createdAt: 100,
      updatedAt: 100,
    });
    service.vaultItems.push(
      {
        id: 'matching',
        content: 'matching secret',
        labelIds: ['token'],
        contextId: 'environment:production',
        pinned: false,
        createdAt: 100,
        updatedAt: 300,
      },
      {
        id: 'wrong-context',
        content: 'other secret',
        labelIds: ['token'],
        pinned: false,
        createdAt: 100,
        updatedAt: 200,
      },
    );
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/search-panel',
        payload: {
          kind: 'vault',
          query: '',
          page: 0,
          pageSize: 1,
          contextId: 'environment:production',
          labelId: 'token',
        },
      },
      trustedExtensionPageSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        items: [
          {
            id: 'matching',
            context: {
              id: 'environment:production',
              name: 'Production',
              color: 'red',
              environment: 'production',
            },
          },
        ],
        pagination: {
          total: 1,
          totalPages: 1,
        },
      },
    });
  });

  it('allows side panel searches and manual creation without authorizing selection capture', async () => {
    const service = new FakeVaultService();
    service.vaultItems.push({
      id: 'side-panel-result',
      content: 'side-panel-content',
      labelIds: [],
      createdAt: 100,
      updatedAt: 100,
      pinned: false,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/search-panel',
          payload: {
            kind: 'vault',
            query: '',
            page: 0,
            pageSize: 12,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        items: [
          {
            id: 'side-panel-result',
            content: 'side-panel-content',
          },
        ],
      },
    });

    await expect(
      controller.handle(
        { type: 'snippet-vault/get-labels' },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        labels: expect.arrayContaining([
          { id: 'token', name: 'Token' },
          { id: 'client-id', name: 'Client ID' },
        ]),
      },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'vault',
            content: '  **manually entered token**  ',
            labelIds: ['token', 'client-id'],
            contextId: 'environment:production',
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: 'generated-id',
        kind: 'vault',
        labelStatus: 'updated',
        searchStatus: 'synchronized',
      },
    });
    expect(service.vaultItems).toContainEqual({
      id: 'generated-id',
      content: '  **manually entered token**  ',
      labelIds: ['token', 'client-id'],
      contextId: 'environment:production',
      pinned: false,
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    expect(
      service.labels.find((label) => label.id === 'token'),
    ).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });
    expect(
      service.labels.find((label) => label.id === 'client-id'),
    ).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'must-not-save',
            labelIds: [],
            temporary: true,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(service.workspaceItems).toHaveLength(0);
  });

  it('allows a trusted content search panel to create a manual snippet', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/create-snippet',
        payload: {
          kind: 'workspace',
          content: 'temporary deployment token',
          labelIds: ['token'],
          contextId: 'environment:staging',
        },
      },
      trustedSender,
    );

    expect(response).toMatchObject({
      ok: true,
      data: {
        id: 'generated-id',
        kind: 'workspace',
        searchStatus: 'synchronized',
      },
    });
    expect(service.vaultItems).toHaveLength(0);
    expect(service.workspaceItems).toEqual([
      {
        id: 'generated-id',
        content: 'temporary deployment token',
        labelIds: ['token'],
        contextId: 'environment:staging',
        createdAt: 1_000,
        updatedAt: 1_000,
        expiresAt: 1_000 + DEFAULT_WORKSPACE_TTL_MS,
      },
    ]);
  });

  it('updates a vault item while preserving immutable fields and only touching newly added active labels', async () => {
    const service = new FakeVaultService();
    service.labels.push(
      {
        id: 'token',
        name: 'Token',
        usageCount: 4,
        lastUsedAt: 400,
        createdAt: 100,
        updatedAt: 400,
      },
      {
        id: 'legacy',
        name: 'Legacy',
        usageCount: 2,
        lastUsedAt: 200,
        archivedAt: 500,
        createdAt: 100,
        updatedAt: 500,
      },
      {
        id: 'client-id',
        name: 'Client ID',
        usageCount: 0,
        createdAt: 100,
        updatedAt: 100,
      },
    );
    service.vaultItems.push({
      id: 'vault-edit',
      content: 'old secret',
      labelIds: ['token', 'legacy'],
      contextId: 'context:shared-qa',
      source: {
        title: 'Console',
        url: 'https://console.example.com/projects/1',
        domain: 'console.example.com',
      },
      pinned: true,
      lastUsedAt: 777,
      createdAt: 100,
      updatedAt: 900,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'vault',
            id: 'vault-edit',
            expectedUpdatedAt: 900,
            content: 'new secret',
            labelIds: ['token', 'legacy', 'client-id'],
            context: { mode: 'clear' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'vault-edit',
        kind: 'vault',
        updatedAt: 1_000,
        searchStatus: 'synchronized',
        labelStatus: 'updated',
      },
    });

    expect(service.vaultItems).toEqual([
      {
        id: 'vault-edit',
        content: 'new secret',
        labelIds: ['token', 'legacy', 'client-id'],
        source: {
          title: 'Console',
          url: 'https://console.example.com/projects/1',
          domain: 'console.example.com',
        },
        pinned: true,
        lastUsedAt: 777,
        createdAt: 100,
        updatedAt: 1_000,
      },
    ]);
    expect(
      service.labels.find((label) => label.id === 'token'),
    ).toMatchObject({
      usageCount: 4,
      lastUsedAt: 400,
    });
    expect(
      service.labels.find((label) => label.id === 'legacy'),
    ).toMatchObject({
      usageCount: 2,
      lastUsedAt: 200,
      archivedAt: 500,
    });
    expect(
      service.labels.find((label) => label.id === 'client-id'),
    ).toMatchObject({
      usageCount: 1,
      lastUsedAt: 1_000,
    });
  });

  it('preserves workspace expiry by default and allows explicit future expiry changes', async () => {
    const service = new FakeVaultService();
    service.workspaceItems.push({
      id: 'workspace-edit',
      content: 'temporary note',
      labelIds: [],
      contextId: 'context:legacy',
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 5_000,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-edit',
            expectedUpdatedAt: 900,
            content: 'temporary note updated',
            labelIds: [],
            context: { mode: 'preserve' },
          },
        },
        trustedSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'workspace-edit',
        kind: 'workspace',
        updatedAt: 1_000,
        expiresAt: 5_000,
        searchStatus: 'synchronized',
        labelStatus: 'updated',
      },
    });
    expect(service.workspaceItems[0]).toMatchObject({
      content: 'temporary note updated',
      contextId: 'context:legacy',
      expiresAt: 5_000,
      updatedAt: 1_000,
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-edit',
            expectedUpdatedAt: 1_000,
            content: 'temporary note updated again',
            labelIds: [],
            context: { mode: 'clear' },
            expiresAt: 9_000,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'workspace-edit',
        kind: 'workspace',
        updatedAt: 1_001,
        expiresAt: 9_000,
        searchStatus: 'synchronized',
        labelStatus: 'updated',
      },
    });
    expect(service.workspaceItems[0]).toEqual({
      id: 'workspace-edit',
      content: 'temporary note updated again',
      labelIds: [],
      createdAt: 100,
      updatedAt: 1_001,
      expiresAt: 9_000,
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-edit',
            expectedUpdatedAt: 1_001,
            content: 'temporary note updated again',
            labelIds: [],
            context: { mode: 'preserve' },
            expiresAt: 999,
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_MESSAGE' },
    });
  });

  it('rejects stale and missing snippet edits', async () => {
    const service = new FakeVaultService();
    service.vaultItems.push({
      id: 'vault-edit',
      content: 'old secret',
      labelIds: ['token'],
      pinned: false,
      createdAt: 100,
      updatedAt: 900,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'vault',
            id: 'vault-edit',
            expectedUpdatedAt: 800,
            content: 'new secret',
            labelIds: ['token'],
            context: { mode: 'preserve' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'vault',
            id: 'missing',
            expectedUpdatedAt: 900,
            content: 'new secret',
            labelIds: ['token'],
            context: { mode: 'preserve' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  it('preserves archived labels and historical context on edit but rejects newly selecting archived taxonomy', async () => {
    const service = new FakeVaultService();
    service.labels.push(
      {
        id: 'legacy',
        name: 'Legacy',
        usageCount: 3,
        archivedAt: 300,
        createdAt: 100,
        updatedAt: 300,
      },
      {
        id: 'retired',
        name: 'Retired',
        usageCount: 0,
        archivedAt: 400,
        createdAt: 100,
        updatedAt: 400,
      },
    );
    service.contextPresets.push({
      id: 'context:archived',
      name: 'Shared QA',
      archivedAt: 350,
      createdAt: 100,
      updatedAt: 350,
    });
    service.workspaceItems.push({
      id: 'workspace-archive',
      content: 'temporary note',
      labelIds: ['legacy'],
      contextId: 'context:archived',
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 5_000,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-archive',
            expectedUpdatedAt: 900,
            content: 'temporary note preserved',
            labelIds: ['legacy'],
            context: { mode: 'preserve' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: 'workspace-archive',
        kind: 'workspace',
        expiresAt: 5_000,
      },
    });
    expect(service.workspaceItems[0]).toMatchObject({
      labelIds: ['legacy'],
      contextId: 'context:archived',
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-archive',
            expectedUpdatedAt: 1_000,
            content: 'temporary note preserved',
            labelIds: ['legacy', 'retired'],
            context: { mode: 'preserve' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_LABEL' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'workspace',
            id: 'workspace-archive',
            expectedUpdatedAt: 1_000,
            content: 'temporary note preserved',
            labelIds: ['legacy'],
            context: { mode: 'set', contextId: 'context:archived' },
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_MESSAGE' },
    });
  });

  it('allows a trusted extension page to delete a saved item', async () => {
    const service = new FakeVaultService();
    service.vaultItems.push({
      id: 'side-panel-delete',
      content: 'remove from side panel',
      labelIds: [],
      createdAt: 100,
      updatedAt: 100,
      pinned: false,
    });
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/delete-item',
        payload: {
          kind: 'vault',
          id: 'side-panel-delete',
        },
      },
      trustedExtensionPageSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        searchStatus: 'synchronized',
      },
    });
    expect(service.vaultItems).toHaveLength(0);
  });

  it('extends an active workspace record from its current expiry using the configured days', async () => {
    const service = new FakeVaultService();
    service.workspaceItems.push({
      id: 'workspace-extend',
      content: 'temporary secret',
      labelIds: [],
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 5_000,
    });
    const controller = new VaultMessageController({
      service,
      clock: () => 1_000,
      idFactory: () => 'generated-id',
      workspaceExpiryDaysProvider: () => Promise.resolve(3),
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/extend-workspace-item',
          payload: { id: 'workspace-extend', expectedUpdatedAt: 900 },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'workspace-extend',
        updatedAt: 1_000,
        expiresAt: 5_000 + 3 * 24 * 60 * 60 * 1_000,
        addedDays: 3,
        searchStatus: 'synchronized',
      },
    });
    expect(service.workspaceItems[0]).toMatchObject({
      updatedAt: 1_000,
      expiresAt: 5_000 + 3 * 24 * 60 * 60 * 1_000,
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/extend-workspace-item',
          payload: { id: 'workspace-extend', expectedUpdatedAt: 900 },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });
  });

  it('promotes an unlabeled active workspace record to vault without changing its identity', async () => {
    const service = new FakeVaultService();
    service.workspaceItems.push({
      id: 'workspace-promote',
      content: 'temporary secret',
      labelIds: [],
      contextId: 'environment:test',
      source: {
        title: 'Console',
        url: 'https://console.example.com/secret',
        domain: 'console.example.com',
      },
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 5_000,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/promote-workspace-item',
          payload: { id: 'workspace-promote', expectedUpdatedAt: 900 },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toEqual({
      ok: true,
      data: {
        id: 'workspace-promote',
        kind: 'vault',
        updatedAt: 1_000,
        searchStatus: 'synchronized',
      },
    });
    expect(service.workspaceItems).toHaveLength(0);
    expect(service.vaultItems).toEqual([
      {
        id: 'workspace-promote',
        content: 'temporary secret',
        labelIds: [],
        contextId: 'environment:test',
        source: {
          title: 'Console',
          url: 'https://console.example.com/secret',
          domain: 'console.example.com',
        },
        pinned: false,
        createdAt: 100,
        updatedAt: 1_000,
      },
    ]);
  });

  it('does not extend or promote expired workspace records', async () => {
    const service = new FakeVaultService();
    service.workspaceItems.push({
      id: 'workspace-expired',
      content: 'expired secret',
      labelIds: [],
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 1_000,
    });
    const controller = createController(service);

    for (const type of [
      'snippet-vault/extend-workspace-item' as const,
      'snippet-vault/promote-workspace-item' as const,
    ]) {
      await expect(
        controller.handle(
          {
            type,
            payload: { id: 'workspace-expired', expectedUpdatedAt: 900 },
          },
          trustedExtensionPageSender,
        ),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: 'NOT_FOUND' },
      });
    }
    expect(service.workspaceItems).toHaveLength(1);
    expect(service.vaultItems).toHaveLength(0);
  });

  it('restricts workspace lifecycle mutations to trusted extension pages', async () => {
    const service = new FakeVaultService();
    service.workspaceItems.push({
      id: 'workspace-protected',
      content: 'temporary secret',
      labelIds: [],
      createdAt: 100,
      updatedAt: 900,
      expiresAt: 5_000,
    });
    const controller = createController(service);

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/promote-workspace-item',
          payload: { id: 'workspace-protected', expectedUpdatedAt: 900 },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
    expect(service.workspaceItems).toHaveLength(1);
    expect(service.vaultItems).toHaveLength(0);
  });

  it('allows a trusted content search panel to delete a saved item', async () => {
    const service = new FakeVaultService();
    service.vaultItems.push({
      id: 'content-panel-delete',
      content: 'remove from the in-page search panel',
      labelIds: [],
      createdAt: 100,
      updatedAt: 100,
      pinned: false,
    });
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/delete-item',
        payload: {
          kind: 'vault',
          id: 'content-panel-delete',
        },
      },
      trustedSender,
    );

    expect(response).toEqual({
      ok: true,
      data: {
        searchStatus: 'synchronized',
      },
    });
    expect(service.vaultItems).toHaveLength(0);
  });

  it('allows unlabeled vault records from manual and selection capture flows', async () => {
    const manualService = new FakeVaultService();
    const manualController = createController(manualService);
    await expect(
      manualController.handle(
        {
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'vault',
            content: 'unclassified manual secret',
            labelIds: [],
          },
        },
        trustedExtensionPageSender,
      ),
    ).resolves.toMatchObject({ ok: true, data: { kind: 'vault' } });
    expect(manualService.vaultItems[0]?.labelIds).toEqual([]);

    const selectionService = new FakeVaultService();
    const selectionController = createController(selectionService);
    await expect(
      selectionController.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'unclassified selected secret',
            labelIds: [],
            temporary: false,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({ ok: true, data: { kind: 'vault' } });
    expect(selectionService.vaultItems[0]?.labelIds).toEqual([]);
  });

  it('rejects untrusted senders and invalid save payloads', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    await expect(
      controller.handle(
        { type: 'snippet-vault/get-labels' },
        { ...trustedSender, senderId: 'other-extension' },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/delete-item',
          payload: {
            kind: 'vault',
            id: 'must-not-delete',
          },
        },
        { ...trustedExtensionPageSender, senderId: 'other-extension' },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'vault',
            content: 'value',
            labelIds: ['token'],
          },
        },
        { ...trustedExtensionPageSender, senderId: 'other-extension' },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/update-snippet',
          payload: {
            kind: 'vault',
            id: 'must-not-update',
            expectedUpdatedAt: 100,
            content: 'value',
            labelIds: ['token'],
            context: { mode: 'preserve' },
          },
        },
        { ...trustedExtensionPageSender, senderId: 'other-extension' },
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'value',
            labelIds: ['token', 'unknown'],
            temporary: false,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_LABEL' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'value',
            labelIds: ['token', 'token'],
            temporary: false,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_LABEL' },
    });

    await expect(
      controller.handle(
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: '   ',
            labelIds: ['token'],
            temporary: false,
          },
        },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_SELECTION' },
    });
  });

  it('returns validation messages in the request locale', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);
    const request = {
      type: 'snippet-vault/save-selection' as const,
      payload: {
        content: '   ',
        labelIds: ['token'],
        temporary: false,
      },
    };

    await expect(
      controller.handle(
        { ...request, locale: 'en' },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_SELECTION',
        message: 'Select between 1 and 100,000 characters.',
      },
    });
    await expect(
      controller.handle(
        { ...request, locale: 'zh_CN' },
        trustedSender,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_SELECTION',
        message: '请选择 1 至 100,000 个字符。',
      },
    });
  });
});

function createController(service: FakeVaultService): VaultMessageController {
  return new VaultMessageController({
    service,
    clock: () => 1_000,
    idFactory: () => 'generated-id',
  });
}
