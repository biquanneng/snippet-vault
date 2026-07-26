// SPDX-License-Identifier: MPL-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FlexSearchIndex } from './flexsearch-index';
import { IndexedDbVaultRepository } from './indexeddb-repository';
import type { Label, VaultItem, WorkspaceItem } from './model';
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

const vaultItem: VaultItem = {
  id: 'vault-1',
  content: 'sk-live-meowdex',
  labelIds: [tokenLabel.id],
  context: 'meowdex production',
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
    await service.saveVaultItem(vaultItem);

    for (const query of [
      'token',
      'meowdex',
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

  it('removes stale search hits after update and delete', async () => {
    await service.saveVaultItem(vaultItem);
    await service.saveVaultItem({
      ...vaultItem,
      content: 'replacement-value',
      updatedAt: 200,
    });

    await expect(service.search('meowdex')).resolves.toHaveLength(1);
    await expect(service.search('sk live')).resolves.toEqual([]);
    await expect(service.search('replacement')).resolves.toHaveLength(1);

    await service.deleteItem({ kind: 'vault', id: vaultItem.id });
    await expect(service.search('replacement')).resolves.toEqual([]);
  });

  it('rebuilds denormalized search documents when a label is renamed', async () => {
    await service.saveLabel(tokenLabel);
    await service.saveVaultItem(vaultItem);
    await service.saveLabel({
      ...tokenLabel,
      name: 'Credential',
      updatedAt: 200,
    });

    await expect(service.search('token')).resolves.toEqual([]);
    await expect(service.search('credential')).resolves.toHaveLength(1);
  });

  it('serializes concurrent writes before searching', async () => {
    await Promise.all([
      service.saveVaultItem(vaultItem),
      service.saveVaultItem({
        ...vaultItem,
        id: 'vault-2',
        content: 'second-concurrent-value',
      }),
    ]);

    await expect(service.search('meowdex')).resolves.toHaveLength(2);
    const meta = await repository.getMeta();
    expect(meta).toMatchObject({
      dataRevision: 2,
      indexedRevision: 2,
    });
  });

  it('filters and prunes expired workspace records', async () => {
    const workspaceItem: WorkspaceItem = {
      id: 'temporary',
      content: 'one-time-code',
      labelIds: [],
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };
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

  it('paginates an empty vault browse without mixing workspace records', async () => {
    await service.saveVaultItem({
      ...vaultItem,
      id: 'old',
      updatedAt: 100,
    });
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
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    });

    await expect(
      service.browse('vault', { offset: 1, limit: 1 }),
    ).resolves.toMatchObject({
      total: 3,
      offset: 1,
      limit: 1,
      hasMore: true,
      results: [
        {
          ref: { kind: 'vault', id: 'recent' },
        },
      ],
    });
  });

  it('filters full-text results by vault or workspace kind', async () => {
    await service.saveVaultItem({
      ...vaultItem,
      id: 'shared-vault',
      content: 'shared-search-term',
    });
    await service.saveWorkspaceItem({
      id: 'shared-workspace',
      content: 'shared-search-term',
      labelIds: [],
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    });

    await expect(
      service.search('shared search', { kind: 'workspace' }),
    ).resolves.toEqual([
      expect.objectContaining({
        ref: { kind: 'workspace', id: 'shared-workspace' },
      }),
    ]);
  });

  it('reuses a committed index after a service-worker-style restart', async () => {
    await service.saveVaultItem(vaultItem);
    await service.close();

    repository = new IndexedDbVaultRepository({ databaseName });
    searchIndex = new FlexSearchIndex({ namespace });
    service = new SnippetVaultService({
      repository,
      searchIndex,
      clock: () => now,
    });

    await expect(service.search('meowdex')).resolves.toHaveLength(1);
  });

  it('rebuilds the index when business data has a newer revision', async () => {
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
      dataRevision: 3,
      indexedRevision: 1,
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

    const receipt = await service.saveVaultItem(vaultItem);

    expect(receipt.searchStatus).toBe('rebuild-required');
    await expect(
      repository.getItem({ kind: 'vault', id: vaultItem.id }),
    ).resolves.toEqual({ kind: 'vault', item: vaultItem });
    const meta = await repository.getMeta();
    expect(meta.indexedRevision).toBeLessThan(meta.dataRevision);
  });
});
