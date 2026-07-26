// SPDX-License-Identifier: MPL-2.0

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IndexedDbVaultRepository } from './indexeddb-repository';
import type { Label, VaultItem, WorkspaceItem } from './model';

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
    expect(await repository.getItem({ kind: 'vault', id: vaultItem.id })).toEqual({
      kind: 'vault',
      item: vaultItem,
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
});
