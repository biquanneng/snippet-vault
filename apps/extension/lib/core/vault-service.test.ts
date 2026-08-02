// SPDX-License-Identifier: MPL-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FlexSearchIndex } from './flexsearch-index';
import { IndexedDbVaultRepository } from './indexeddb-repository';
import type {
  ContextPreset,
  Label,
  StorageMeta,
  StoredRecord,
  VaultSnapshot,
  VaultItem,
  WorkspaceItem,
} from './model';
import type { VaultRepository } from './repository';
import type {
  SearchDocument,
  SearchHit,
  SearchIndex,
} from './search-index';
import { SnippetVaultService } from './vault-service';

let serviceSequence = 0;
let databaseName: string;
let namespace: string;
let repository: IndexedDbVaultRepository;
let searchIndex: FlexSearchIndex;
let service: SnippetVaultService;
let now: number;

const tokenLabel: Label = {
  id: 'token',
  name: 'Token',
  usageCount: 1,
  createdAt: 100,
  updatedAt: 100,
};

const noteLabel: Label = {
  id: 'note',
  name: 'Note',
  usageCount: 1,
  createdAt: 100,
  updatedAt: 100,
};

const productionContextPreset: ContextPreset = {
  id: 'context:atlas-production',
  name: 'Project Atlas',
  environment: 'production',
  createdAt: 100,
  updatedAt: 100,
};

const stagingContextPreset: ContextPreset = {
  id: 'context:atlas-staging',
  name: 'Project Atlas Staging',
  environment: 'staging',
  createdAt: 100,
  updatedAt: 100,
};

const vaultItem: VaultItem = {
  id: 'vault-1',
  content: 'sk-live-meowdex',
  labelIds: [tokenLabel.id],
  contextId: productionContextPreset.id,
  source: {
    title: 'Credentials',
    url: 'https://console.example.com/projects/meowdex/credentials',
    domain: 'console.example.com',
  },
  pinned: false,
  createdAt: 100,
  updatedAt: 100,
};

beforeEach(() => {
  serviceSequence += 1;
  databaseName = `snippet-vault-service-test-${serviceSequence}`;
  namespace = `snippet-vault-service-search-test-${serviceSequence}`;
  now = 500;
  repository = new IndexedDbVaultRepository({ databaseName });
  searchIndex = new FlexSearchIndex({ namespace });
  service = new SnippetVaultService({
    repository,
    searchIndex,
    clock: () => now,
  });
});

afterEach(async () => {
  await service.close();
  await repository.destroy();
  await searchIndex.destroy();
});

describe('SnippetVaultService', () => {
  it('coordinates repository writes with label, context, URL and content search', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);

    for (const query of [
      'token',
      'atlas',
      'production',
      'console.example',
      'credentials',
      'sk live',
      'token production',
    ]) {
      const results = await service.search(query);
      expect(results[0]).toMatchObject({
        ref: { kind: 'vault', id: vaultItem.id },
        item: vaultItem,
      });
    }
    await expect(service.search('definitely absent')).resolves.toEqual([]);

    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBe(meta.dataRevision);
  });

  it('indexes locale aliases from labels and context presets without changing stored records', async () => {
    const passwordLabel: Label = {
      id: 'password',
      name: '密码',
      usageCount: 1,
      createdAt: 100,
      updatedAt: 100,
    };
    const localizedContextPreset: ContextPreset = {
      id: 'context:localized-production',
      name: '支付系统',
      environment: 'production',
      createdAt: 100,
      updatedAt: 100,
    };
    const localizedItem: VaultItem = {
      ...vaultItem,
      id: 'localized-vault',
      content: 'credential-value',
      labelIds: [passwordLabel.id],
      contextId: localizedContextPreset.id,
    };

    await service.saveLabel(passwordLabel);
    await service.saveContextPreset(localizedContextPreset);
    await service.saveVaultItem(localizedItem);

    for (const query of [
      'password',
      '密码',
      'production',
      '生产环境',
      '支付系统',
    ]) {
      await expect(service.search(query)).resolves.toMatchObject([
        {
          ref: { kind: 'vault', id: localizedItem.id },
        },
      ]);
    }

    await expect(repository.listLabels()).resolves.toContainEqual(
      passwordLabel,
    );
    await expect(
      repository.getItem({
        kind: 'vault',
        id: localizedItem.id,
      }),
    ).resolves.toMatchObject({
      kind: 'vault',
      item: {
        contextId: localizedContextPreset.id,
      },
    });
  });

  it('indexes full access-key aliases for records created with the legacy label id', async () => {
    const legacyAccessKeyLabel: Label = {
      id: 'ak',
      name: 'AK',
      usageCount: 1,
      createdAt: 100,
      updatedAt: 100,
    };
    const legacyAccessKeyItem: VaultItem = {
      ...vaultItem,
      id: 'legacy-access-key-vault',
      content: 'credential-value',
      labelIds: [legacyAccessKeyLabel.id],
    };

    await service.saveLabel(legacyAccessKeyLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(legacyAccessKeyItem);

    for (const query of ['AK', 'Access Key']) {
      await expect(service.search(query)).resolves.toMatchObject([
        {
          ref: { kind: 'vault', id: legacyAccessKeyItem.id },
        },
      ]);
    }
  });

  it('removes stale search hits after update and delete', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);
    await service.saveVaultItem({
      ...vaultItem,
      content: 'replacement-value',
      updatedAt: 200,
    });

    await expect(service.search('atlas')).resolves.toHaveLength(1);
    await expect(service.search('sk live')).resolves.toEqual([]);
    await expect(service.search('replacement')).resolves.toHaveLength(1);

    await service.deleteItem({ kind: 'vault', id: vaultItem.id });
    await expect(service.search('replacement')).resolves.toEqual([]);
  });

  it('rebuilds denormalized search documents when a label is renamed', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);
    await service.saveLabel({
      ...tokenLabel,
      name: 'Credential',
      updatedAt: 200,
    });

    await expect(service.search('token')).resolves.toEqual([]);
    await expect(service.search('credential')).resolves.toHaveLength(1);
  });

  it('rebuilds denormalized search documents when a context preset changes', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);

    const receipt = await service.saveContextPreset({
      ...productionContextPreset,
      name: 'Project Borealis',
      environment: 'staging',
      updatedAt: 200,
    });

    expect(receipt.searchStatus).toBe('synchronized');
    await expect(service.search('atlas')).resolves.toEqual([]);
    await expect(service.search('production')).resolves.toEqual([]);
    await expect(service.search('borealis')).resolves.toHaveLength(1);
    await expect(service.search('staging')).resolves.toHaveLength(1);
    await expect(repository.getMeta()).resolves.toMatchObject({
      indexedRevision: 4,
      dataRevision: 4,
    });
  });

  it('keeps index revisions aligned after taxonomy metadata updates that do not affect documents', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);

    const usageReceipt = await service.touchLabelUsage(tokenLabel.id, 200);

    expect(usageReceipt.searchStatus).toBe('synchronized');
    await expect(repository.getMeta()).resolves.toMatchObject({
      dataRevision: 4,
      indexedRevision: 4,
    });
  });

  it('serializes concurrent writes before searching', async () => {
    await Promise.all([
      service.saveContextPreset(productionContextPreset),
      service.saveContextPreset(stagingContextPreset),
    ]);
    await Promise.all([
      service.saveVaultItem(vaultItem),
      service.saveVaultItem({
        ...vaultItem,
        id: 'vault-2',
        contextId: stagingContextPreset.id,
        content: 'second-concurrent-value',
      }),
    ]);

    await expect(service.search('project atlas')).resolves.toHaveLength(2);
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBe(meta.dataRevision);
  });

  it('allows only one concurrent conditional vault update to succeed', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);

    const [first, second] = await Promise.all([
      service.saveVaultItemIfUnchanged(
        {
          ...vaultItem,
          content: 'vault-update-a',
          updatedAt: 200,
        },
        100,
      ),
      service.saveVaultItemIfUnchanged(
        {
          ...vaultItem,
          content: 'vault-update-b',
          updatedAt: 300,
        },
        100,
      ),
    ]);

    expect([first.outcome, second.outcome].sort()).toEqual([
      'conflict',
      'updated',
    ]);
    await expect(service.search('vault update')).resolves.toHaveLength(1);
    await expect(service.search('vault-update-a')).resolves.toHaveLength(
      first.outcome === 'updated' ? 1 : 0,
    );
    await expect(service.search('vault-update-b')).resolves.toHaveLength(
      second.outcome === 'updated' ? 1 : 0,
    );
    const stored = await repository.getItem({ kind: 'vault', id: vaultItem.id });
    expect(stored?.item.content).toBe(
      first.outcome === 'updated' ? 'vault-update-a' : 'vault-update-b',
    );
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBe(meta.dataRevision);
  });

  it('allows only one concurrent conditional workspace update to succeed', async () => {
    const workspace: WorkspaceItem = {
      id: 'workspace-concurrent',
      content: 'temporary-value',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    await service.saveContextPreset(productionContextPreset);
    await service.saveWorkspaceItem(workspace);

    const [first, second] = await Promise.all([
      service.saveWorkspaceItemIfUnchanged(
        {
          ...workspace,
          content: 'workspace-update-a',
          updatedAt: 200,
          expiresAt: 1_500,
        },
        100,
      ),
      service.saveWorkspaceItemIfUnchanged(
        {
          ...workspace,
          content: 'workspace-update-b',
          updatedAt: 300,
          expiresAt: 1_600,
        },
        100,
      ),
    ]);

    expect([first.outcome, second.outcome].sort()).toEqual([
      'conflict',
      'updated',
    ]);
    const stored = await repository.getItem({
      kind: 'workspace',
      id: workspace.id,
    });
    expect(stored?.item.content).toBe(
      first.outcome === 'updated'
        ? 'workspace-update-a'
        : 'workspace-update-b',
    );
    expect(stored?.item.updatedAt).toBe(
      first.outcome === 'updated' ? 200 : 300,
    );
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBe(meta.dataRevision);
  });

  it('filters and prunes expired workspace records', async () => {
    const workspaceItem: WorkspaceItem = {
      id: 'temporary',
      content: 'one-time-code',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    await service.saveContextPreset(productionContextPreset);
    await service.saveWorkspaceItem(workspaceItem);

    await expect(service.search('one time')).resolves.toHaveLength(1);
    now = 1_000;
    await expect(service.search('one time')).resolves.toEqual([]);

    const prune = await service.pruneExpired();
    expect(prune.changed).toBe(true);
    await expect(
      service.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toBeNull();
  });

  it('returns active workspace records before pinned and recent vault records for an empty query', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem({
      ...vaultItem,
      id: 'recent',
      updatedAt: 400,
    });
    await service.saveVaultItem({
      ...vaultItem,
      id: 'pinned',
      pinned: true,
      updatedAt: 200,
    });
    await service.saveWorkspaceItem({
      id: 'temporary',
      content: 'temporary',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    });

    const results = await service.search('');
    expect(results.map((result) => result.ref)).toEqual([
      { kind: 'workspace', id: 'temporary' },
      { kind: 'vault', id: 'pinned' },
      { kind: 'vault', id: 'recent' },
    ]);
  });

  it('applies exact label and context filters before browse pagination', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveLabel(noteLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveContextPreset(stagingContextPreset);
    await service.saveVaultItem(vaultItem);
    await service.saveVaultItem({
      ...vaultItem,
      id: 'vault-note',
      labelIds: [noteLabel.id],
    });
    await service.saveVaultItem({
      ...vaultItem,
      id: 'vault-staging',
      contextId: stagingContextPreset.id,
    });
    await service.saveWorkspaceItem({
      id: 'workspace-token',
      content: 'temporary',
      labelIds: [tokenLabel.id],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    });

    await expect(
      service.browse('vault', {
        offset: 0,
        limit: 10,
        contextId: productionContextPreset.id,
        labelId: tokenLabel.id,
      }),
    ).resolves.toMatchObject({
      total: 1,
      results: [
        {
          ref: { kind: 'vault', id: vaultItem.id },
        },
      ],
    });
  });

  it('keeps exact text search filters complete before applying the user limit', async () => {
    const target: StoredRecord = {
      kind: 'vault',
      item: {
        id: 'target',
        content: 'shared-search-term',
        labelIds: ['token'],
        contextId: 'context:target',
        pinned: false,
        createdAt: 100,
        updatedAt: 100,
      },
    };
    const distractorA: StoredRecord = {
      kind: 'vault',
      item: {
        id: 'distractor-a',
        content: 'shared-search-term',
        labelIds: ['note'],
        contextId: 'context:target',
        pinned: false,
        createdAt: 100,
        updatedAt: 100,
      },
    };
    const distractorB: StoredRecord = {
      kind: 'vault',
      item: {
        id: 'distractor-b',
        content: 'shared-search-term',
        labelIds: ['token'],
        contextId: 'context:other',
        pinned: false,
        createdAt: 100,
        updatedAt: 100,
      },
    };
    const records = [distractorA, distractorB, target];
    const searchCalls: Array<{
      query: string;
      limit: number;
      kind: 'vault' | 'workspace' | undefined;
    }> = [];

    const filterRepository: VaultRepository = {
      getMeta: async (): Promise<StorageMeta> => ({
        schemaVersion: 3,
        dataRevision: 0,
        indexedRevision: 0,
        searchSchemaVersion: 5,
      }),
      markSearchIndexed: async () => true,
      putVaultItem: async () => ({ changed: true, dataRevision: 1 }),
      putWorkspaceItem: async () => ({ changed: true, dataRevision: 1 }),
      putVaultItemIfUnchanged: async () => ({
        changed: true,
        dataRevision: 1,
        outcome: 'updated',
      }),
      putWorkspaceItemIfUnchanged: async () => ({
        changed: true,
        dataRevision: 1,
        outcome: 'updated',
      }),
      putLabel: async () => ({ changed: true, dataRevision: 1 }),
      putContextPreset: async () => ({ changed: true, dataRevision: 1 }),
      touchLabelUsage: async () => ({ changed: true, dataRevision: 1 }),
      deleteItem: async () => ({ changed: false, dataRevision: 0 }),
      promoteWorkspaceItem: async () => ({
        changed: false,
        dataRevision: 0,
        outcome: 'not-found',
      }),
      pruneExpired: async () => ({
        changed: false,
        dataRevision: 0,
        removed: [],
      }),
      readSnapshot: async () => ({
        labels: [],
        contextPresets: [],
        records,
      }),
      readSnapshotWithRevision: async () => ({
        snapshot: { labels: [], contextPresets: [], records },
        dataRevision: 0,
      }),
      replaceSnapshot: async () => ({
        changed: true,
        dataRevision: 1,
        outcome: 'updated',
      }),
      getItem: async () => null,
      getItems: async (references) =>
        references.flatMap((reference) =>
          records.filter(
            (record) =>
              record.kind === reference.kind &&
              record.item.id === reference.id,
          ),
        ),
      listActiveRecords: async () => records,
      listLabels: async () => [],
      listContextPresets: async () => [],
      close: async () => {},
    };
    const limitingSearchIndex: SearchIndex = {
      open: async () => {},
      clear: async () => {},
      upsert: (_document: SearchDocument) => {},
      remove: (_id: string) => {},
      commit: async () => {},
      search: async (query, limit, kind) => {
        searchCalls.push({ query, limit, kind });
        return [
          { id: 'vault:distractor-a' },
          { id: 'vault:distractor-b' },
          { id: 'vault:target' },
        ].slice(0, limit);
      },
      close: async () => {},
    };
    const filterService = new SnippetVaultService({
      repository: filterRepository,
      searchIndex: limitingSearchIndex,
      clock: () => now,
    });

    await expect(
      filterService.search('shared search', {
        kind: 'vault',
        labelId: 'token',
        contextId: 'context:target',
        limit: 1,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'vault', id: 'target' },
      }),
    ]);
    expect(searchCalls).toEqual([
      {
        query: 'shared search',
        limit: 3,
        kind: 'vault',
      },
    ]);
    await filterService.close();
  });

  it('prunes expired index hits before limiting an exact-filter search', async () => {
    const target: StoredRecord = {
      kind: 'workspace',
      item: {
        id: 'active-target',
        content: 'shared-search-term',
        labelIds: ['token'],
        contextId: 'context:target',
        createdAt: 100,
        updatedAt: 100,
        expiresAt: 1_000,
      },
    };
    let expiredHitPresent = true;
    let pruneCalls = 0;

    const filterRepository: VaultRepository = {
      getMeta: async (): Promise<StorageMeta> => ({
        schemaVersion: 3,
        dataRevision: 1,
        indexedRevision: 1,
        searchSchemaVersion: 5,
      }),
      markSearchIndexed: async () => true,
      putVaultItem: async () => ({ changed: true, dataRevision: 1 }),
      putWorkspaceItem: async () => ({ changed: true, dataRevision: 1 }),
      putVaultItemIfUnchanged: async () => ({
        changed: true,
        dataRevision: 1,
        outcome: 'updated',
      }),
      putWorkspaceItemIfUnchanged: async () => ({
        changed: true,
        dataRevision: 1,
        outcome: 'updated',
      }),
      putLabel: async () => ({ changed: true, dataRevision: 1 }),
      putContextPreset: async () => ({ changed: true, dataRevision: 1 }),
      touchLabelUsage: async () => ({ changed: true, dataRevision: 1 }),
      deleteItem: async () => ({ changed: false, dataRevision: 1 }),
      promoteWorkspaceItem: async () => ({
        changed: false,
        dataRevision: 1,
        outcome: 'not-found',
      }),
      pruneExpired: async () => {
        pruneCalls += 1;
        return pruneCalls === 1
          ? {
              changed: true,
              dataRevision: 2,
              removed: [{ kind: 'workspace', id: 'expired-distractor' }],
            }
          : { changed: false, dataRevision: 2, removed: [] };
      },
      readSnapshot: async () => ({
        labels: [],
        contextPresets: [],
        records: [target],
      }),
      readSnapshotWithRevision: async () => ({
        snapshot: { labels: [], contextPresets: [], records: [target] },
        dataRevision: 2,
      }),
      replaceSnapshot: async () => ({
        changed: true,
        dataRevision: 2,
        outcome: 'updated',
      }),
      getItem: async () => null,
      getItems: async (references) =>
        references.some(
          (reference) =>
            reference.kind === target.kind &&
            reference.id === target.item.id,
        )
          ? [target]
          : [],
      listActiveRecords: async () => [target],
      listLabels: async () => [],
      listContextPresets: async () => [],
      close: async () => {},
    };
    const limitingSearchIndex: SearchIndex = {
      open: async () => {},
      clear: async () => {},
      upsert: (_document: SearchDocument) => {},
      remove: (id) => {
        if (id === 'workspace:expired-distractor') {
          expiredHitPresent = false;
        }
      },
      commit: async () => {},
      search: async (_query, limit) =>
        [
          ...(expiredHitPresent
            ? [{ id: 'workspace:expired-distractor' }]
            : []),
          { id: 'workspace:active-target' },
        ].slice(0, limit),
      close: async () => {},
    };
    const filterService = new SnippetVaultService({
      repository: filterRepository,
      searchIndex: limitingSearchIndex,
      clock: () => now,
    });

    await expect(
      filterService.search('shared search', {
        kind: 'workspace',
        labelId: 'token',
        contextId: 'context:target',
        limit: 1,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'workspace', id: 'active-target' },
      }),
    ]);
    expect(pruneCalls).toBe(1);
    expect(expiredHitPresent).toBe(false);
    await filterService.close();
  });

  it('exports archived taxonomy after pruning expired workspace records', async () => {
    const archivedLabel: Label = {
      ...noteLabel,
      archivedAt: 200,
    };
    const archivedContextPreset: ContextPreset = {
      ...stagingContextPreset,
      archivedAt: 200,
    };
    const activeWorkspace: WorkspaceItem = {
      id: 'active-workspace',
      content: 'active temporary value',
      labelIds: [tokenLabel.id],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    const expiredWorkspace: WorkspaceItem = {
      ...activeWorkspace,
      id: 'expired-workspace',
      content: 'expired temporary value',
      expiresAt: now,
    };

    await service.saveLabel(tokenLabel);
    await service.saveLabel(archivedLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveContextPreset(archivedContextPreset);
    await service.saveVaultItem(vaultItem);
    await service.saveWorkspaceItem(activeWorkspace);
    await service.saveWorkspaceItem(expiredWorkspace);

    const exported = await service.exportSnapshot();
    const { snapshot } = exported;

    expect(snapshot.labels).toEqual(expect.arrayContaining([tokenLabel, archivedLabel]));
    expect(snapshot.contextPresets).toEqual(
      expect.arrayContaining([productionContextPreset, archivedContextPreset]),
    );
    expect(snapshot.records).toEqual([
      { kind: 'vault', item: vaultItem },
      { kind: 'workspace', item: activeWorkspace },
    ]);
    expect(snapshot).toMatchObject({
      labels: expect.arrayContaining([archivedLabel]),
      contextPresets: expect.arrayContaining([archivedContextPreset]),
    });
    await expect(
      repository.getItem({ kind: 'workspace', id: expiredWorkspace.id }),
    ).resolves.toBeNull();
  });

  it('replaces the snapshot before rebuilding a searchable index', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);
    const before = await repository.getMeta();
    const replacement: VaultSnapshot = {
      labels: [noteLabel],
      contextPresets: [stagingContextPreset],
      records: [
        {
          kind: 'vault',
          item: {
            ...vaultItem,
            id: 'replacement-vault',
            content: 'replacement searchable content',
            labelIds: [noteLabel.id],
            contextId: stagingContextPreset.id,
          },
        },
      ],
    };

    await expect(
      service.replaceSnapshot(replacement, before.dataRevision),
    ).resolves.toEqual({
      changed: true,
      dataRevision: before.dataRevision + 1,
      searchStatus: 'synchronized',
      outcome: 'updated',
    });
    await expect(repository.readSnapshot(now)).resolves.toEqual(replacement);
    await expect(service.search('replacement searchable')).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'vault', id: 'replacement-vault' },
      }),
    ]);
    await expect(service.search('sk live meowdex')).resolves.toEqual([]);
  });

  it('rejects a stale exported snapshot without changing data', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveVaultItem(vaultItem);
    const exported = await service.exportSnapshot();
    await service.saveVaultItem({
      ...vaultItem,
      id: 'written-after-export',
      content: 'newer committed data',
    });
    const beforeReplace = await repository.readSnapshot(now);
    const beforeMeta = await repository.getMeta();

    await expect(
      service.replaceSnapshot(exported.snapshot, exported.dataRevision),
    ).resolves.toEqual({
      changed: false,
      dataRevision: beforeMeta.dataRevision,
      outcome: 'conflict',
      searchStatus: 'synchronized',
    });
    await expect(repository.readSnapshot(now)).resolves.toEqual(beforeReplace);
    await expect(repository.getMeta()).resolves.toEqual(beforeMeta);
  });

  it('keeps replacement data when snapshot index rebuilding fails', async () => {
    class FailingSnapshotSearchIndex implements SearchIndex {
      async open() {}
      async clear() {}
      upsert(_document: SearchDocument) {}
      remove(_id: string) {}
      async commit() {
        throw new Error('synthetic snapshot commit failure');
      }
      async search(_query: string, _limit: number): Promise<SearchHit[]> {
        return [];
      }
      async close() {}
    }

    await service.saveVaultItem(vaultItem);
    service = new SnippetVaultService({
      repository,
      searchIndex: new FailingSnapshotSearchIndex(),
      clock: () => now,
    });
    const replacement: VaultSnapshot = {
      labels: [noteLabel],
      contextPresets: [stagingContextPreset],
      records: [
        {
          kind: 'vault',
          item: {
            ...vaultItem,
            id: 'replacement-after-failure',
            content: 'replacement data survives',
            labelIds: [noteLabel.id],
            contextId: stagingContextPreset.id,
          },
        },
      ],
    };

    const before = await repository.getMeta();
    await expect(
      service.replaceSnapshot(replacement, before.dataRevision),
    ).resolves.toMatchObject({
      changed: true,
      searchStatus: 'rebuild-required',
      outcome: 'updated',
    });
    await expect(repository.readSnapshot(now)).resolves.toEqual(replacement);
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBeLessThan(meta.dataRevision);
  });

  it('reuses a committed index after a service-worker-style restart', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);
    await service.close();

    repository = new IndexedDbVaultRepository({ databaseName });
    searchIndex = new FlexSearchIndex({ namespace });
    service = new SnippetVaultService({
      repository,
      searchIndex,
      clock: () => now,
    });

    await expect(service.search('atlas')).resolves.toHaveLength(1);
  });

  it('rebuilds the index when business data has a newer revision', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);
    await repository.putVaultItem({
      ...vaultItem,
      id: 'outside-service',
      content: 'newly-persisted-value',
    });
    await service.close();

    repository = new IndexedDbVaultRepository({ databaseName });
    searchIndex = new FlexSearchIndex({ namespace });
    service = new SnippetVaultService({
      repository,
      searchIndex,
      clock: () => now,
    });

    const results = await service.search('newly persisted');
    expect(results[0]?.ref).toEqual({
      kind: 'vault',
      id: 'outside-service',
    });
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBe(meta.dataRevision);
  });

  it('does not mark a partial incremental update as synchronized after an interleaved write', async () => {
    await service.saveContextPreset(productionContextPreset);
    await service.saveVaultItem(vaultItem);

    const interleavedItem: VaultItem = {
      ...vaultItem,
      id: 'interleaved',
      content: 'written-outside-service',
    };
    let injected = false;
    const interleavingRepository = new Proxy(repository, {
      get(target, property, receiver) {
        if (property === 'putVaultItem') {
          return async (item: VaultItem) => {
            if (!injected) {
              injected = true;
              await target.putVaultItem(interleavedItem);
            }
            return target.putVaultItem(item);
          };
        }

        const value = Reflect.get(target, property, receiver) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as VaultRepository;

    service = new SnippetVaultService({
      repository: interleavingRepository,
      searchIndex,
      clock: () => now,
    });
    const receipt = await service.saveVaultItem({
      ...vaultItem,
      id: 'service-write',
      content: 'written-by-service',
    });

    expect(receipt.searchStatus).toBe('rebuild-required');
    const staleMeta = await repository.getMeta();
    expect(staleMeta).toMatchObject({
      dataRevision: 4,
      indexedRevision: 2,
    });

    await expect(service.search('outside service')).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'vault', id: interleavedItem.id },
      }),
    ]);
    const rebuiltMeta = await repository.getMeta();
    expect(rebuiltMeta.indexedRevision).toBe(rebuiltMeta.dataRevision);
  });

  it('keeps saved data and leaves the revision stale when index commit fails', async () => {
    class FailingSearchIndex implements SearchIndex {
      async open() {}
      async clear() {}
      upsert(_document: SearchDocument) {}
      remove(_id: string) {}
      async commit() {
        throw new Error('synthetic commit failure');
      }
      async search(_query: string, _limit: number): Promise<SearchHit[]> {
        return [];
      }
      async close() {}
    }

    service = new SnippetVaultService({
      repository,
      searchIndex: new FailingSearchIndex(),
      clock: () => now,
    });

    const receipt = await service.saveContextPreset(productionContextPreset);

    expect(receipt.searchStatus).toBe('rebuild-required');
    await expect(
      repository.listContextPresets({ includeArchived: true }),
    ).resolves.toEqual([productionContextPreset]);
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBeLessThan(meta.dataRevision);
  });

  it('promotes a workspace item into vault storage and swaps the indexed kind', async () => {
    const workspaceItem: WorkspaceItem = {
      id: 'workspace-promote',
      content: 'temporary-value',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    const promoted: VaultItem = {
      ...vaultItem,
      id: workspaceItem.id,
      content: workspaceItem.content,
      labelIds: [],
      createdAt: workspaceItem.createdAt,
      updatedAt: 200,
    };
    await service.saveContextPreset(productionContextPreset);
    await service.saveWorkspaceItem(workspaceItem);

    const receipt = await service.promoteWorkspaceItem(
      workspaceItem.id,
      promoted,
      workspaceItem.updatedAt,
    );

    expect(receipt).toMatchObject({
      changed: true,
      outcome: 'updated',
      searchStatus: 'synchronized',
    });
    await expect(
      service.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toBeNull();
    await expect(
      service.getItem({ kind: 'vault', id: promoted.id }),
    ).resolves.toEqual({ kind: 'vault', item: promoted });
    await expect(service.search('temporary value')).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'vault', id: promoted.id },
      }),
    ]);
  });

  it('returns not-found and conflict outcomes for workspace promotion preconditions', async () => {
    const workspaceItem: WorkspaceItem = {
      id: 'workspace-promote-conflict',
      content: 'temporary-value',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    await service.saveContextPreset(productionContextPreset);
    await service.saveWorkspaceItem(workspaceItem);
    await service.saveWorkspaceItemIfUnchanged(
      {
        ...workspaceItem,
        content: 'temporary-value-updated',
        updatedAt: 200,
        expiresAt: 1_500,
      },
      workspaceItem.updatedAt,
    );

    const promoted: VaultItem = {
      ...vaultItem,
      id: workspaceItem.id,
      content: workspaceItem.content,
      labelIds: [],
      createdAt: workspaceItem.createdAt,
      updatedAt: 300,
    };

    await expect(
      service.promoteWorkspaceItem(
        workspaceItem.id,
        promoted,
        workspaceItem.updatedAt,
      ),
    ).resolves.toMatchObject({
      changed: false,
      outcome: 'conflict',
      searchStatus: 'synchronized',
    });
    await expect(
      service.promoteWorkspaceItem(
        'missing-workspace',
        { ...promoted, id: 'missing-workspace' },
        workspaceItem.updatedAt,
      ),
    ).resolves.toMatchObject({
      changed: false,
      outcome: 'not-found',
      searchStatus: 'synchronized',
    });
  });

  it('keeps promoted data and returns rebuild-required when the promotion index commit fails', async () => {
    class FailingPromotionSearchIndex implements SearchIndex {
      async open() {}
      async clear() {}
      upsert(_document: SearchDocument) {}
      remove(_id: string) {}
      async commit() {
        throw new Error('synthetic promotion commit failure');
      }
      async search(_query: string, _limit: number): Promise<SearchHit[]> {
        return [];
      }
      async close() {}
    }

    const workspaceItem: WorkspaceItem = {
      id: 'workspace-promote-failing-index',
      content: 'temporary-value',
      labelIds: [],
      contextId: productionContextPreset.id,
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
    const promoted: VaultItem = {
      ...vaultItem,
      id: workspaceItem.id,
      content: workspaceItem.content,
      labelIds: [],
      createdAt: workspaceItem.createdAt,
      updatedAt: 200,
    };
    await service.saveContextPreset(productionContextPreset);
    await service.saveWorkspaceItem(workspaceItem);

    service = new SnippetVaultService({
      repository,
      searchIndex: new FailingPromotionSearchIndex(),
      clock: () => now,
    });

    const receipt = await service.promoteWorkspaceItem(
      workspaceItem.id,
      promoted,
      workspaceItem.updatedAt,
    );

    expect(receipt).toMatchObject({
      changed: true,
      outcome: 'updated',
      searchStatus: 'rebuild-required',
    });
    await expect(
      repository.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toBeNull();
    await expect(
      repository.getItem({ kind: 'vault', id: promoted.id }),
    ).resolves.toEqual({ kind: 'vault', item: promoted });
  });
});
