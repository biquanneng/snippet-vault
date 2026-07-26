// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import type {
  Label,
  MutationReceipt,
  SearchResult,
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
  readonly vaultItems: VaultItem[] = [];
  readonly workspaceItems: WorkspaceItem[] = [];

  async listLabels(): Promise<Label[]> {
    return structuredClone(this.labels);
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

  async saveVaultItem(item: VaultItem): Promise<MutationReceipt> {
    this.vaultItems.push(structuredClone(item));
    return synchronizedReceipt();
  }

  async saveWorkspaceItem(item: WorkspaceItem): Promise<MutationReceipt> {
    this.workspaceItems.push(structuredClone(item));
    return synchronizedReceipt();
  }

  async search(
    _query: string,
    options: { kind?: 'vault' | 'workspace'; limit?: number },
  ): Promise<SearchResult[]> {
    return this.results(options.kind).slice(0, options.limit);
  }

  async browse(
    kind: 'vault' | 'workspace',
    options: { offset?: number; limit?: number },
  ): Promise<BrowsePage> {
    const records = this.results(kind);
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

  private results(kind?: 'vault' | 'workspace'): SearchResult[] {
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
      (result) => !kind || result.ref.kind === kind,
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

describe('VaultMessageController', () => {
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
          { id: 'ak', name: 'AK' },
          { id: 'sk', name: 'SK' },
          { id: 'token', name: 'Token' },
          { id: 'password', name: '密码' },
          { id: 'note', name: '备注' },
        ],
      },
    });
    expect(service.labels).toHaveLength(5);
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
          labelId: 'custom:generated-id',
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

  it('saves the exact selected Markdown with context and trusted page source', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/save-selection',
        payload: {
          content: '  **sk-live-preserve-whitespace**  ',
          labelId: 'token',
          context: '  meowdex production  ',
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
        labelIds: ['token'],
        context: 'meowdex production',
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
  });

  it('saves temporary selections with the default expiry', async () => {
    const service = new FakeVaultService();
    const controller = createController(service);

    const response = await controller.handle(
      {
        type: 'snippet-vault/save-selection',
        payload: {
          content: 'one-time-code',
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
    service.workspaceItems.push({
      id: 'temporary',
      content: 'one-time-code',
      labelIds: [],
      context: 'deployment',
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
            context: 'deployment',
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

  it('allows side panel searches without authorizing extension-page writes', async () => {
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
        {
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'must-not-save',
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
          type: 'snippet-vault/save-selection',
          payload: {
            content: 'value',
            labelId: 'unknown',
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
            labelId: 'token',
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
});

function createController(service: FakeVaultService): VaultMessageController {
  return new VaultMessageController({
    service,
    clock: () => 1_000,
    idFactory: () => 'generated-id',
  });
}
