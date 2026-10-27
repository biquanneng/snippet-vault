// SPDX-License-Identifier: MPL-2.0

import { IDBDatabase, IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import { IndexedDbVaultRepository } from './indexeddb-repository';
import { FlexSearchIndex } from './flexsearch-index';
import { SnippetVaultService } from './vault-service';
import { SEARCH_SCHEMA_VERSION, STORAGE_SCHEMA_VERSION } from './model';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const originalItem = { id: 'item', content: 'synthetic', labelIds: ['token'], contextId: 'custom', createdAt: 10, updatedAt: 20, pinned: true };
const originalMeta = { key: 'storage', schemaVersion: 3, dataRevision: 8, indexedRevision: 8, searchSchemaVersion: 5 };

async function createV3(factory: IDBFactory, corrupt = false): Promise<void> {
  // Storage schema v3 shipped in IndexedDB database version 2.
  const request = factory.open('legacy', 2);
  request.onupgradeneeded = () => {
    const db = request.result;
    const vault = db.createObjectStore('vault_items', { keyPath: 'id' });
    const workspace = db.createObjectStore('workspace_items', { keyPath: 'id' });
    workspace.createIndex('expiresAt', 'expiresAt');
    const labels = db.createObjectStore('labels', { keyPath: 'id' });
    const contexts = db.createObjectStore('context_presets', { keyPath: 'id' });
    db.createObjectStore('meta', { keyPath: 'key' }).put(originalMeta);
    labels.put({ id: 'token', name: 'Token', usageCount: 2, createdAt: 1, updatedAt: 2 });
    labels.put({ id: 'existing', name: '  PROJECT  ', usageCount: 9, createdAt: 1, updatedAt: 2 });
    contexts.put({ id: 'custom', name: 'project', createdAt: 3, updatedAt: 4 });
    contexts.put({ id: 'archived', name: 'Retired', archivedAt: 5, createdAt: 3, updatedAt: 4 });
    contexts.put({ id: 'environment-old', name: 'Production', environment: corrupt ? 'unknown' : 'production', createdAt: 3, updatedAt: 4 });
    contexts.put({ id: 'unused', name: 'Unreferenced', createdAt: 3, updatedAt: 4 });
    vault.put(originalItem);
    vault.put({ ...originalItem, id: 'environment', contextId: 'environment-old' });
    const { contextId: _contextId, ...plain } = originalItem;
    vault.put({ ...plain, id: 'plain' });
    vault.put({ ...originalItem, id: 'missing', contextId: 'absent' });
    workspace.put({ ...originalItem, id: 'temporary', contextId: 'archived', expiresAt: 1_000 });
    workspace.put({ ...originalItem, id: 'expired', expiresAt: 0 });
  };
  (await requestResult(request)).close();
}

async function readLegacy(factory: IDBFactory) {
  const db = await requestResult(factory.open('legacy'));
  try {
    const tx = db.transaction(['vault_items', 'workspace_items', 'labels', 'context_presets', 'meta'], 'readonly');
    const [vault, workspace, labels, presets, meta] = await Promise.all([
      requestResult(tx.objectStore('vault_items').getAll()),
      requestResult(tx.objectStore('workspace_items').getAll()),
      requestResult(tx.objectStore('labels').getAll()),
      requestResult(tx.objectStore('context_presets').getAll()),
      requestResult(tx.objectStore('meta').get('storage')),
    ]);
    return { version: db.version, vault, workspace, labels, presets, meta };
  } finally {
    db.close();
  }
}

describe('atomic storage schema v3 to v4 upgrade', () => {
  it('preserves old records, converts both stores, drops presets and rebuilds search on reopen', async () => {
    const factory = new IDBFactory();
    await createV3(factory);
    let repository = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
    const snapshot = await repository.readSnapshot(100);
    expect(snapshot.records).toHaveLength(5);
    expect(snapshot.labels).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'existing', name: '  PROJECT  ', usageCount: 9 }),
      { id: 'archived', name: 'Retired', archivedAt: 5, usageCount: 1, createdAt: 3, updatedAt: 4 },
      { id: 'environment:production', name: '生产环境', usageCount: 1, createdAt: 3, updatedAt: 4 },
    ]));
    expect(snapshot.labels.some((label) => label.id === 'unused')).toBe(false);
    expect(snapshot.records.find((record) => record.item.id === 'item')?.item).toEqual({ id: 'item', content: 'synthetic', labelIds: ['token', 'existing'], createdAt: 10, updatedAt: 20, pinned: true });
    expect(snapshot.records.find((record) => record.item.id === 'missing')?.item.labelIds).toEqual(['token']);
    expect(snapshot.records.find((record) => record.item.id === 'temporary')?.item.labelIds).toEqual(['token', 'archived']);
    for (const record of snapshot.records) {
      expect(record.item).not.toHaveProperty('contextId');
      expect(record.item.updatedAt).toBe(20);
    }
    const meta = await repository.getMeta();
    expect(meta).toMatchObject({ schemaVersion: STORAGE_SCHEMA_VERSION, dataRevision: 9, searchSchemaVersion: 0 });
    expect(meta.indexedRevision).not.toBe(meta.dataRevision);
    await repository.close();

    const db = await requestResult(factory.open('legacy'));
    expect(db.objectStoreNames.contains('context_presets')).toBe(false);
    db.close();
    repository = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
    expect(await repository.readSnapshot(100)).toEqual(snapshot);
    expect(await repository.getMeta()).toEqual(meta);

    const search = new FlexSearchIndex({ namespace: 'context-migration-search' });
    const service = new SnippetVaultService({ repository, searchIndex: search, clock: () => 100 });
    try {
      expect((await service.search('production')).map((result) => result.ref.id)).toEqual(['environment']);
      expect((await service.search('Retired')).map((result) => result.ref.id)).toEqual(['temporary']);
      expect((await service.search('project')).map((result) => result.ref.id)).toEqual(['item']);
      expect(await repository.getMeta()).toMatchObject({ indexedRevision: 9, searchSchemaVersion: SEARCH_SCHEMA_VERSION });
    } finally {
      await service.close();
      await search.destroy();
    }
  });

  it('does not seed migrated environment labels or legacy stores for fresh databases', async () => {
    const factory = new IDBFactory();
    const repository = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
    expect(await repository.readSnapshot(0)).toEqual({ labels: [], records: [] });
    expect(await repository.getMeta()).toMatchObject({ schemaVersion: 4, dataRevision: 0 });
    await repository.close();
    const db = await requestResult(factory.open('legacy'));
    expect(db.objectStoreNames.contains('context_presets')).toBe(false);
    db.close();
  });

  it('aborts corrupt legacy conversion without discarding committed records', async () => {
    const factory = new IDBFactory();
    await createV3(factory, true);
    const before = await readLegacy(factory);
    const repository = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
    await expect(repository.getMeta()).rejects.toBeDefined();
    expect(await readLegacy(factory)).toEqual(before);
  });

  it('rolls back writes, metadata, store deletion and version when the final upgrade step fails, then retries safely', async () => {
    const factory = new IDBFactory();
    await createV3(factory);
    const before = await readLegacy(factory);
    const spy = vi.spyOn(IDBDatabase.prototype, 'deleteObjectStore').mockImplementation(() => { throw new Error('synthetic upgrade interruption'); });
    try {
      const repository = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
      await expect(repository.getMeta()).rejects.toBeDefined();
    } finally {
      spy.mockRestore();
    }
    expect(await readLegacy(factory)).toEqual(before);
    const retry = new IndexedDbVaultRepository({ indexedDB: factory, databaseName: 'legacy' });
    expect((await retry.readSnapshot(100)).records).toHaveLength(5);
    expect(await retry.getMeta()).toMatchObject({ schemaVersion: 4 });
    await retry.close();
  });
});
