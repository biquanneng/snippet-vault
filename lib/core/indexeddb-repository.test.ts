// SPDX-License-Identifier: MPL-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IndexedDbVaultRepository } from './indexeddb-repository';
import type { ContextPreset, Label, VaultItem, WorkspaceItem } from './model';

let databaseSequence = 0;
let repository: IndexedDbVaultRepository;

const label: Label = {
  id: 'label-token',
  name: 'Token',
  usageCount: 1,
  createdAt: 100,
  updatedAt: 100,
};

const vaultItem: VaultItem = {
  id: 'vault-1',
  content: 'production-token',
  labelIds: [label.id],
  context: 'meowdex production',
  contextColor: 'purple',
  source: {
    title: 'Cloud console',
    url: 'https://console.example.com/projects/meowdex?tab=credentials',
    domain: 'console.example.com',
  },
  pinned: false,
  createdAt: 100,
  updatedAt: 100,
};

const workspaceItem: WorkspaceItem = {
  id: 'workspace-1',
  content: 'temporary-value',
  labelIds: [],
  createdAt: 100,
  updatedAt: 100,
  expiresAt: 1_000,
};

const contextPreset: ContextPreset = {
  id: 'context:qa',
  name: 'Shared QA',
  color: 'cyan',
  createdAt: 100,
  updatedAt: 100,
};

beforeEach(() => {
  databaseSequence += 1;
  repository = new IndexedDbVaultRepository({
    databaseName: `snippet-vault-repository-test-${databaseSequence}`,
  });
});

afterEach(async () => {
  await repository.destroy();
});

describe('IndexedDbVaultRepository', () => {
  it('persists labels and complete source metadata while advancing data revision', async () => {
    expect(await repository.getMeta()).toMatchObject({
      dataRevision: 0,
      indexedRevision: 0,
    });

    const labelMutation = await repository.putLabel(label);
    const itemMutation = await repository.putVaultItem(vaultItem);

    expect(labelMutation).toEqual({ changed: true, dataRevision: 1 });
    expect(itemMutation).toEqual({ changed: true, dataRevision: 2 });
    expect(await repository.getItem({ kind: 'vault', id: vaultItem.id })).toEqual({
      kind: 'vault',
      item: vaultItem,
    });
  });

  it('stores context presets separately from business records and filters archived entries from active lists', async () => {
    const archivedLabel: Label = {
      ...label,
      id: 'archived-label',
      archivedAt: 200,
    };
    const archivedContextPreset: ContextPreset = {
      ...contextPreset,
      id: 'context:archived',
      archivedAt: 200,
    };

    await repository.putLabel(label);
    await repository.putLabel(archivedLabel);
    await repository.putContextPreset(contextPreset);
    await repository.putContextPreset(archivedContextPreset);

    await expect(repository.listLabels()).resolves.toEqual([label]);
    await expect(
      repository.listLabels({ includeArchived: true }),
    ).resolves.toEqual(
      expect.arrayContaining([label, archivedLabel]),
    );
    await expect(repository.listContextPresets()).resolves.toEqual([
      contextPreset,
    ]);
    await expect(
      repository.listContextPresets({ includeArchived: true }),
    ).resolves.toEqual(
      expect.arrayContaining([contextPreset, archivedContextPreset]),
    );
  });

  it('touches label usage without overwriting the stored name', async () => {
    await repository.putLabel(label);
    await repository.putLabel({
      ...label,
      name: 'Credential',
      updatedAt: 200,
    });

    const mutation = await repository.touchLabelUsage(label.id, 300);
    const [storedLabel] = await repository.listLabels({ includeArchived: true });

    expect(mutation).toEqual({
      changed: true,
      dataRevision: 3,
    });
    expect(storedLabel).toEqual({
      ...label,
      name: 'Credential',
      usageCount: 2,
      lastUsedAt: 300,
      updatedAt: 300,
    });
  });

  it('keeps vault and workspace IDs isolated and excludes expired workspace records', async () => {
    await repository.putVaultItem({ ...vaultItem, id: 'shared-id' });
    await repository.putWorkspaceItem({
      ...workspaceItem,
      id: 'shared-id',
      expiresAt: 500,
    });

    const activeAt400 = await repository.listActiveRecords(400);
    const activeAt500 = await repository.listActiveRecords(500);

    expect(activeAt400.map((record) => record.kind)).toEqual([
      'vault',
      'workspace',
    ]);
    expect(activeAt500.map((record) => record.kind)).toEqual(['vault']);
  });

  it('prunes all expired workspace records in one revision and ignores missing deletes', async () => {
    await repository.putWorkspaceItem({ ...workspaceItem, id: 'expired-a' });
    await repository.putWorkspaceItem({
      ...workspaceItem,
      id: 'expired-b',
      expiresAt: 2_000,
    });
    await repository.putWorkspaceItem({
      ...workspaceItem,
      id: 'active',
      expiresAt: 2_001,
    });

    const beforePrune = (await repository.getMeta()).dataRevision;
    const prune = await repository.pruneExpired(2_000);
    const missingDelete = await repository.deleteItem({
      kind: 'workspace',
      id: 'missing',
    });

    expect(prune).toEqual({
      changed: true,
      dataRevision: beforePrune + 1,
      removed: [
        { kind: 'workspace', id: 'expired-a' },
        { kind: 'workspace', id: 'expired-b' },
      ],
    });
    expect(missingDelete).toEqual({
      changed: false,
      dataRevision: beforePrune + 1,
    });
    expect(
      await repository.getItem({ kind: 'workspace', id: 'active' }),
    ).not.toBeNull();
  });

  it('promotes a workspace record atomically', async () => {
    await repository.putWorkspaceItem(workspaceItem);
    const promoted: VaultItem = {
      ...vaultItem,
      id: workspaceItem.id,
      content: workspaceItem.content,
      createdAt: workspaceItem.createdAt,
      updatedAt: 300,
    };

    const beforePromotion = (await repository.getMeta()).dataRevision;
    const mutation = await repository.promoteWorkspaceItem(
      workspaceItem.id,
      promoted,
    );

    expect(mutation).toEqual({
      changed: true,
      dataRevision: beforePromotion + 1,
    });
    expect(
      await repository.getItem({
        kind: 'workspace',
        id: workspaceItem.id,
      }),
    ).toBeNull();
    expect(
      await repository.getItem({ kind: 'vault', id: promoted.id }),
    ).toEqual({ kind: 'vault', item: promoted });
  });

  it('conditionally updates vault and workspace items only when updatedAt still matches', async () => {
    await repository.putVaultItem(vaultItem);
    await repository.putWorkspaceItem(workspaceItem);

    const vaultSuccess = await repository.putVaultItemIfUnchanged(
      {
        ...vaultItem,
        content: 'rotated-production-token',
        updatedAt: 200,
      },
      100,
    );
    const vaultConflict = await repository.putVaultItemIfUnchanged(
      {
        ...vaultItem,
        content: 'lost-update',
        updatedAt: 300,
      },
      100,
    );
    const workspaceSuccess = await repository.putWorkspaceItemIfUnchanged(
      {
        ...workspaceItem,
        content: 'temporary-value-updated',
        updatedAt: 200,
        expiresAt: 1_500,
      },
      100,
    );
    const workspaceMissing = await repository.putWorkspaceItemIfUnchanged(
      {
        ...workspaceItem,
        id: 'missing-workspace',
        updatedAt: 200,
      },
      100,
    );

    expect(vaultSuccess).toEqual({
      changed: true,
      dataRevision: 3,
      outcome: 'updated',
    });
    expect(vaultConflict).toEqual({
      changed: false,
      dataRevision: 3,
      outcome: 'conflict',
    });
    expect(workspaceSuccess).toEqual({
      changed: true,
      dataRevision: 4,
      outcome: 'updated',
    });
    expect(workspaceMissing).toEqual({
      changed: false,
      dataRevision: 4,
      outcome: 'not-found',
    });
    await expect(
      repository.getItem({ kind: 'vault', id: vaultItem.id }),
    ).resolves.toEqual({
      kind: 'vault',
      item: {
        ...vaultItem,
        content: 'rotated-production-token',
        updatedAt: 200,
      },
    });
    await expect(
      repository.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toEqual({
      kind: 'workspace',
      item: {
        ...workspaceItem,
        content: 'temporary-value-updated',
        updatedAt: 200,
        expiresAt: 1_500,
      },
    });
  });

  it('upgrades a version 1 database to version 2 without losing records', async () => {
    const databaseName = `snippet-vault-repository-v1-test-${databaseSequence}`;
    await repository.destroy();
    await createLegacyVersion1Database(databaseName);

    repository = new IndexedDbVaultRepository({ databaseName });

    await expect(repository.getMeta()).resolves.toMatchObject({
      schemaVersion: 2,
      dataRevision: 3,
    });
    await expect(
      repository.getItem({ kind: 'vault', id: vaultItem.id }),
    ).resolves.toEqual({
      kind: 'vault',
      item: vaultItem,
    });
    await expect(
      repository.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toEqual({
      kind: 'workspace',
      item: workspaceItem,
    });
    await expect(repository.listLabels({ includeArchived: true })).resolves.toEqual([
      label,
    ]);
    await expect(repository.listContextPresets()).resolves.toEqual([]);
  });
});

async function createLegacyVersion1Database(databaseName: string): Promise<void> {
  const request = indexedDB.open(databaseName, 1);

  request.onupgradeneeded = () => {
    const database = request.result;
    const vaultStore = database.createObjectStore('vault_items', {
      keyPath: 'id',
    });
    const workspaceStore = database.createObjectStore('workspace_items', {
      keyPath: 'id',
    });
    workspaceStore.createIndex('expiresAt', 'expiresAt');
    const labelStore = database.createObjectStore('labels', { keyPath: 'id' });
    const metaStore = database.createObjectStore('meta', { keyPath: 'key' });
    metaStore.put({
      key: 'storage',
      schemaVersion: 1,
      dataRevision: 0,
      indexedRevision: 0,
      searchSchemaVersion: 0,
    });

    vaultStore.put(vaultItem);
    workspaceStore.put(workspaceItem);
    labelStore.put(label);
    metaStore.put({
      key: 'storage',
      schemaVersion: 1,
      dataRevision: 3,
      indexedRevision: 0,
      searchSchemaVersion: 0,
    });
  };

  const database = await idbRequestToPromise(request);
  database.close();
}

function idbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}
