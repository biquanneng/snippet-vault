// SPDX-License-Identifier: MPL-2.0

import type { LegacyContextPreset } from './context-migration';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IndexedDbVaultRepository } from './indexeddb-repository';
import type {
  Label,
  VaultSnapshot,
  VaultItem,
  WorkspaceItem,
} from './model';

let databaseSequence = 0;
let repository: IndexedDbVaultRepository;

const label: Label = {
  id: 'label-token',
  name: 'Token',
  usageCount: 1,
  createdAt: 100,
  updatedAt: 100,
};

const contextPreset: LegacyContextPreset = {
  id: 'context:meowdex-production',
  name: 'Meowdex',
  environment: 'production',
  createdAt: 100,
  updatedAt: 100,
};

const vaultItem: VaultItem = {
  id: 'vault-1',
  content: 'production-token',
  labelIds: [label.id],
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
    expect(
      await repository.getItem({ kind: 'vault', id: vaultItem.id }),
    ).toEqual({
      kind: 'vault',
      item: vaultItem,
    });
  });

  it('filters archived labels from active lists while preserving history', async () => {
    const archivedLabel = { ...label, id: 'archived', archivedAt: 200 };
    await repository.putLabel(label);
    await repository.putLabel(archivedLabel);
    await expect(repository.listLabels()).resolves.toEqual([label]);
    await expect(repository.listLabels({ includeArchived: true })).resolves.toEqual(expect.arrayContaining([label, archivedLabel]));
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

  it('reads archived taxonomy and active records in one snapshot', async () => {
    const archivedLabel: Label = {
      ...label,
      id: 'archived-label',
      archivedAt: 200,
    };
    const activeWorkspace: WorkspaceItem = {
      ...workspaceItem,
      id: 'workspace-active',
      expiresAt: 1_001,
    };
    const expiredWorkspace: WorkspaceItem = {
      ...workspaceItem,
      id: 'workspace-expired',
      expiresAt: 1_000,
    };

    await repository.putLabel(label);
    await repository.putLabel(archivedLabel);
    await repository.putVaultItem(vaultItem);
    await repository.putWorkspaceItem(activeWorkspace);
    await repository.putWorkspaceItem(expiredWorkspace);

    const snapshot = await repository.readSnapshot(1_000);

    expect(snapshot.labels).toEqual(expect.arrayContaining([label, archivedLabel]));
    expect(snapshot.records).toEqual([
      { kind: 'vault', item: vaultItem },
      { kind: 'workspace', item: activeWorkspace },
    ]);
    expect(snapshot).toMatchObject({
      labels: expect.arrayContaining([archivedLabel]),
    });
  });

  it('replaces every business store in one revision', async () => {
    await repository.putLabel(label);
    await repository.putVaultItem(vaultItem);
    await repository.putWorkspaceItem(workspaceItem);
    const before = await repository.getMeta();
    const replacement: VaultSnapshot = {
      labels: [{ ...label, id: 'replacement-label', name: 'Password' }],
      records: [
        {
          kind: 'vault',
          item: { ...vaultItem, id: 'replacement-vault', labelIds: [] },
        },
      ],
    };

    await expect(
      repository.replaceSnapshot(replacement, before.dataRevision),
    ).resolves.toEqual({
      changed: true,
      dataRevision: before.dataRevision + 1,
      outcome: 'updated',
    });
    await expect(repository.readSnapshot(1_000)).resolves.toEqual(replacement);
  });

  it('aborts a failed snapshot replacement without changing committed data', async () => {
    await repository.putLabel(label);
    await repository.putVaultItem(vaultItem);
    const beforeSnapshot = await repository.readSnapshot(1_000);
    const beforeMeta = await repository.getMeta();
    const invalidSnapshot = {
      ...beforeSnapshot,
      labels: [{} as Label],
    } as VaultSnapshot;

    await expect(
      repository.replaceSnapshot(invalidSnapshot, beforeMeta.dataRevision),
    ).rejects.toThrow();
    await expect(repository.readSnapshot(1_000)).resolves.toEqual(beforeSnapshot);
    await expect(repository.getMeta()).resolves.toEqual(beforeMeta);
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
    await expect(
      repository.getItem({ kind: 'workspace', id: 'active' }),
    ).resolves.not.toBeNull();
  });

  it('promotes a workspace record atomically when updatedAt still matches', async () => {
    await repository.putWorkspaceItem(workspaceItem);
    const promoted: VaultItem = {
      ...vaultItem,
      id: workspaceItem.id,
      content: workspaceItem.content,
      labelIds: [],
      createdAt: workspaceItem.createdAt,
      updatedAt: 300,
    };

    const beforePromotion = (await repository.getMeta()).dataRevision;
    const mutation = await repository.promoteWorkspaceItem(
      workspaceItem.id,
      promoted,
      workspaceItem.updatedAt,
    );

    expect(mutation).toEqual({
      changed: true,
      dataRevision: beforePromotion + 1,
      outcome: 'updated',
    });
    await expect(
      repository.getItem({
        kind: 'workspace',
        id: workspaceItem.id,
      }),
    ).resolves.toBeNull();
    await expect(
      repository.getItem({ kind: 'vault', id: promoted.id }),
    ).resolves.toEqual({ kind: 'vault', item: promoted });
  });

  it('refuses to promote missing or stale workspace records', async () => {
    await repository.putWorkspaceItem(workspaceItem);
    await repository.putWorkspaceItemIfUnchanged(
      {
        ...workspaceItem,
        content: 'updated-temporary-value',
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

    const conflict = await repository.promoteWorkspaceItem(
      workspaceItem.id,
      promoted,
      workspaceItem.updatedAt,
    );
    const missing = await repository.promoteWorkspaceItem(
      'missing-workspace',
      { ...promoted, id: 'missing-workspace' },
      workspaceItem.updatedAt,
    );

    expect(conflict).toEqual({
      changed: false,
      dataRevision: 2,
      outcome: 'conflict',
    });
    expect(missing).toEqual({
      changed: false,
      dataRevision: 2,
      outcome: 'not-found',
    });
    await expect(
      repository.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toEqual({
      kind: 'workspace',
      item: {
        ...workspaceItem,
        content: 'updated-temporary-value',
        updatedAt: 200,
        expiresAt: 1_500,
      },
    });
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

  it('resets older item records while preserving taxonomy data from compatible stores', async () => {
    const databaseName = `snippet-vault-repository-v2-test-${databaseSequence}`;
    await repository.destroy();
    await createLegacySchemaDatabase(databaseName);

    repository = new IndexedDbVaultRepository({ databaseName });

    await expect(repository.getMeta()).resolves.toEqual({
      schemaVersion: 4,
      dataRevision: 0,
      indexedRevision: 0,
      searchSchemaVersion: 0,
    });
    await expect(
      repository.getItem({ kind: 'vault', id: vaultItem.id }),
    ).resolves.toBeNull();
    await expect(
      repository.getItem({ kind: 'workspace', id: workspaceItem.id }),
    ).resolves.toBeNull();
    await expect(
      repository.listLabels({ includeArchived: true }),
    ).resolves.toEqual([label]);
  });
});

async function createLegacySchemaDatabase(databaseName: string): Promise<void> {
  const request = indexedDB.open(databaseName, 2);

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
    const contextStore = database.createObjectStore('context_presets', {
      keyPath: 'id',
    });
    const metaStore = database.createObjectStore('meta', { keyPath: 'key' });

    vaultStore.put({
      ...vaultItem,
      context: 'Meowdex Production',
      contextColor: 'purple',
    });
    workspaceStore.put({
      ...workspaceItem,
      context: 'Meowdex Production',
      contextColor: 'purple',
    });
    labelStore.put(label);
    contextStore.put(contextPreset);
    metaStore.put({
      key: 'storage',
      schemaVersion: 2,
      dataRevision: 4,
      indexedRevision: 4,
      searchSchemaVersion: 4,
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
