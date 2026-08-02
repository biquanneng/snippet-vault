// SPDX-License-Identifier: MPL-2.0

import {
  type ConditionalMutationOutcome,
  type ConditionalMutationResult,
  type ContextPreset,
  SEARCH_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION,
  type ItemReference,
  type Label,
  type MutationResult,
  type PruneResult,
  type StorageMeta,
  type StoredRecord,
  type VaultSnapshotExport,
  type VaultSnapshot,
  type VaultItem,
  type WorkspaceItem,
} from './model';
import type { VaultRepository } from './repository';

const DATABASE_VERSION = 2;
const META_KEY = 'storage';

const STORE = {
  contextPresets: 'context_presets',
  labels: 'labels',
  meta: 'meta',
  vaultItems: 'vault_items',
  workspaceItems: 'workspace_items',
} as const;

const INDEX = {
  workspaceExpiresAt: 'expiresAt',
} as const;

interface MetaRecord extends StorageMeta {
  key: typeof META_KEY;
}

interface RepositoryOptions {
  databaseName?: string;
  indexedDB?: IDBFactory;
}

interface MutationOperationResult<T> {
  changed: boolean;
  value: T;
}

const DEFAULT_META: StorageMeta = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  dataRevision: 0,
  indexedRevision: 0,
  searchSchemaVersion: 0,
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
    request.addEventListener('blocked', () =>
      reject(new Error('IndexedDB request was blocked by another connection')),
    );
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

async function runTransaction<T>(
  database: IDBDatabase,
  storeNames: string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const transaction = database.transaction(storeNames, mode);
  const completion = transactionToPromise(transaction);

  try {
    const result = await operation(transaction);
    await completion;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already be completed or aborted.
    }
    await completion.catch(() => undefined);
    throw error;
  }
}

function toMetaRecord(meta: StorageMeta): MetaRecord {
  return {
    key: META_KEY,
    ...meta,
  };
}

function fromMetaRecord(record: MetaRecord | undefined): StorageMeta {
  if (!record) {
    return { ...DEFAULT_META };
  }

  const { key: _key, ...meta } = record;
  return meta;
}

function uniqueStoreNames(storeNames: string[]): string[] {
  return [...new Set(storeNames)];
}

export class IndexedDbVaultRepository implements VaultRepository {
  private readonly databaseName: string;
  private readonly factory: IDBFactory;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: RepositoryOptions = {}) {
    this.databaseName = options.databaseName ?? 'snippet-vault';
    this.factory = options.indexedDB ?? globalThis.indexedDB;

    if (!this.factory) {
      throw new Error('IndexedDB is unavailable in this context');
    }
  }

  async getMeta(): Promise<StorageMeta> {
    const database = await this.getDatabase();
    return runTransaction(database, [STORE.meta], 'readonly', async (tx) => {
      const record = await requestToPromise(
        tx.objectStore(STORE.meta).get(META_KEY) as IDBRequest<
          MetaRecord | undefined
        >,
      );
      return fromMetaRecord(record);
    });
  }

  async markSearchIndexed(
    dataRevision: number,
    searchSchemaVersion: number,
    expectedIndexedRevision?: number,
  ): Promise<boolean> {
    const database = await this.getDatabase();
    return runTransaction(database, [STORE.meta], 'readwrite', async (tx) => {
      const store = tx.objectStore(STORE.meta);
      const record = await requestToPromise(
        store.get(META_KEY) as IDBRequest<MetaRecord | undefined>,
      );
      const current = fromMetaRecord(record);

      if (
        current.dataRevision !== dataRevision ||
        (expectedIndexedRevision !== undefined &&
          current.indexedRevision !== expectedIndexedRevision)
      ) {
        return false;
      }

      store.put(
        toMetaRecord({
          ...current,
          indexedRevision: dataRevision,
          searchSchemaVersion,
        }),
      );
      return true;
    });
  }

  putVaultItem(item: VaultItem): Promise<MutationResult> {
    return this.mutate([STORE.vaultItems], async (tx) => {
      tx.objectStore(STORE.vaultItems).put(item);
      return { changed: true, value: undefined };
    });
  }

  putWorkspaceItem(item: WorkspaceItem): Promise<MutationResult> {
    return this.mutate([STORE.workspaceItems], async (tx) => {
      tx.objectStore(STORE.workspaceItems).put(item);
      return { changed: true, value: undefined };
    });
  }

  putVaultItemIfUnchanged(
    item: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationResult> {
    return this.mutate([STORE.vaultItems], async (tx) => {
      const outcome = await this.putItemIfUnchanged(
        tx.objectStore(STORE.vaultItems),
        item,
        expectedUpdatedAt,
      );
      return {
        changed: outcome === 'updated',
        value: outcome,
      };
    }).then(({ value, ...mutation }) => ({
      ...mutation,
      outcome: value,
    }));
  }

  putWorkspaceItemIfUnchanged(
    item: WorkspaceItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationResult> {
    return this.mutate([STORE.workspaceItems], async (tx) => {
      const outcome = await this.putItemIfUnchanged(
        tx.objectStore(STORE.workspaceItems),
        item,
        expectedUpdatedAt,
      );
      return {
        changed: outcome === 'updated',
        value: outcome,
      };
    }).then(({ value, ...mutation }) => ({
      ...mutation,
      outcome: value,
    }));
  }

  putLabel(label: Label): Promise<MutationResult> {
    return this.mutate([STORE.labels], async (tx) => {
      tx.objectStore(STORE.labels).put(label);
      return { changed: true, value: undefined };
    });
  }

  putContextPreset(preset: ContextPreset): Promise<MutationResult> {
    return this.mutate([STORE.contextPresets], async (tx) => {
      tx.objectStore(STORE.contextPresets).put(preset);
      return { changed: true, value: undefined };
    });
  }

  touchLabelUsage(id: string, time: number): Promise<MutationResult> {
    return this.mutate([STORE.labels], async (tx) => {
      const store = tx.objectStore(STORE.labels);
      const existing = await requestToPromise(
        store.get(id) as IDBRequest<Label | undefined>,
      );

      if (!existing) {
        return { changed: false, value: undefined };
      }

      store.put({
        ...existing,
        usageCount: existing.usageCount + 1,
        lastUsedAt: time,
        updatedAt: time,
      });
      return { changed: true, value: undefined };
    });
  }

  async deleteItem(reference: ItemReference): Promise<MutationResult> {
    const storeName =
      reference.kind === 'vault' ? STORE.vaultItems : STORE.workspaceItems;

    return this.mutate([storeName], async (tx) => {
      const store = tx.objectStore(storeName);
      const existing = await requestToPromise(store.get(reference.id));

      if (existing === undefined) {
        return { changed: false, value: undefined };
      }

      store.delete(reference.id);
      return { changed: true, value: undefined };
    });
  }

  promoteWorkspaceItem(
    workspaceId: string,
    vaultItem: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationResult> {
    return this.mutate(
      [STORE.workspaceItems, STORE.vaultItems],
      async (tx) => {
        const workspaceStore = tx.objectStore(STORE.workspaceItems);
        const existing = await requestToPromise(
          workspaceStore.get(workspaceId) as IDBRequest<
            WorkspaceItem | undefined
          >,
        );

        if (existing === undefined) {
          return {
            changed: false,
            value: 'not-found' as const,
          };
        }
        if (existing.updatedAt !== expectedUpdatedAt) {
          return {
            changed: false,
            value: 'conflict' as const,
          };
        }

        workspaceStore.delete(workspaceId);
        tx.objectStore(STORE.vaultItems).put(vaultItem);
        return {
          changed: true,
          value: 'updated' as const,
        };
      },
    ).then(({ value, ...mutation }) => ({
      ...mutation,
      outcome: value,
    }));
  }

  async pruneExpired(now: number): Promise<PruneResult> {
    const mutation = await this.mutate(
      [STORE.workspaceItems],
      async (tx) => {
        const removed = await this.deleteExpiredWithCursor(
          tx.objectStore(STORE.workspaceItems),
          now,
        );
        return {
          changed: removed.length > 0,
          value: removed,
        };
      },
    );
    const { value, ...result } = mutation;

    return {
      ...result,
      removed: value,
    };
  }

  async readSnapshot(now: number): Promise<VaultSnapshot> {
    const database = await this.getDatabase();
    return runTransaction(
      database,
      [
        STORE.labels,
        STORE.contextPresets,
        STORE.vaultItems,
        STORE.workspaceItems,
      ],
      'readonly',
      (tx) => this.readSnapshotFromTransaction(tx, now),
    );
  }

  async readSnapshotWithRevision(now: number): Promise<VaultSnapshotExport> {
    const database = await this.getDatabase();
    return runTransaction(
      database,
      [
        STORE.labels,
        STORE.contextPresets,
        STORE.vaultItems,
        STORE.workspaceItems,
        STORE.meta,
      ],
      'readonly',
      async (tx) => {
        const [snapshot, record] = await Promise.all([
          this.readSnapshotFromTransaction(tx, now),
          requestToPromise(
            tx.objectStore(STORE.meta).get(META_KEY) as IDBRequest<
              MetaRecord | undefined
            >,
          ),
        ]);
        return {
          snapshot,
          dataRevision: fromMetaRecord(record).dataRevision,
        };
      },
    );
  }

  replaceSnapshot(
    snapshot: VaultSnapshot,
    expectedDataRevision: number,
  ): Promise<ConditionalMutationResult> {
    return this.mutate(
      [
        STORE.labels,
        STORE.contextPresets,
        STORE.vaultItems,
        STORE.workspaceItems,
      ],
      async (tx) => {
        const labels = tx.objectStore(STORE.labels);
        const contextPresets = tx.objectStore(STORE.contextPresets);
        const vaultItems = tx.objectStore(STORE.vaultItems);
        const workspaceItems = tx.objectStore(STORE.workspaceItems);

        labels.clear();
        contextPresets.clear();
        vaultItems.clear();
        workspaceItems.clear();

        for (const label of snapshot.labels) {
          labels.put(label);
        }
        for (const preset of snapshot.contextPresets) {
          contextPresets.put(preset);
        }
        for (const record of snapshot.records) {
          (record.kind === 'vault' ? vaultItems : workspaceItems).put(
            record.item,
          );
        }

        return { changed: true, value: 'updated' as const };
      },
      {
        expectedDataRevision,
        onConflict: () => 'conflict' as const,
      },
    ).then(({ value, ...mutation }) => ({
      ...mutation,
      outcome: value,
    }));
  }

  async getItem(reference: ItemReference): Promise<StoredRecord | null> {
    const database = await this.getDatabase();
    const storeName =
      reference.kind === 'vault' ? STORE.vaultItems : STORE.workspaceItems;

    return runTransaction(database, [storeName], 'readonly', async (tx) => {
      const item = await requestToPromise(
        tx.objectStore(storeName).get(reference.id),
      );
      if (item === undefined) {
        return null;
      }

      return reference.kind === 'vault'
        ? { kind: 'vault', item: item as VaultItem }
        : { kind: 'workspace', item: item as WorkspaceItem };
    });
  }

  async getItems(references: ItemReference[]): Promise<StoredRecord[]> {
    if (references.length === 0) {
      return [];
    }

    const database = await this.getDatabase();
    return runTransaction(
      database,
      [STORE.vaultItems, STORE.workspaceItems],
      'readonly',
      async (tx) => {
        const records = await Promise.all(
          references.map(async (reference): Promise<StoredRecord | null> => {
            const storeName =
              reference.kind === 'vault'
                ? STORE.vaultItems
                : STORE.workspaceItems;
            const item = await requestToPromise(
              tx.objectStore(storeName).get(reference.id),
            );

            if (item === undefined) {
              return null;
            }

            return reference.kind === 'vault'
              ? { kind: 'vault', item: item as VaultItem }
              : { kind: 'workspace', item: item as WorkspaceItem };
          }),
        );

        return records.filter((record): record is StoredRecord => record !== null);
      },
    );
  }

  async listActiveRecords(now: number): Promise<StoredRecord[]> {
    const database = await this.getDatabase();
    return runTransaction(
      database,
      [STORE.vaultItems, STORE.workspaceItems],
      'readonly',
      async (tx) => {
        const [vaultItems, workspaceItems] = await Promise.all([
          requestToPromise(
            tx.objectStore(STORE.vaultItems).getAll() as IDBRequest<VaultItem[]>,
          ),
          requestToPromise(
            tx
              .objectStore(STORE.workspaceItems)
              .getAll() as IDBRequest<WorkspaceItem[]>,
          ),
        ]);

        return [
          ...vaultItems.map(
            (item): StoredRecord => ({ kind: 'vault', item }),
          ),
          ...workspaceItems
            .filter((item) => item.expiresAt > now)
            .map((item): StoredRecord => ({ kind: 'workspace', item })),
        ];
      },
    );
  }

  async listLabels(
    options: { includeArchived?: boolean } = {},
  ): Promise<Label[]> {
    const database = await this.getDatabase();
    return runTransaction(database, [STORE.labels], 'readonly', async (tx) =>
      this.listStoreRecords<Label>(
        tx.objectStore(STORE.labels),
        options.includeArchived ?? false,
      ),
    );
  }

  async listContextPresets(
    options: { includeArchived?: boolean } = {},
  ): Promise<ContextPreset[]> {
    const database = await this.getDatabase();
    return runTransaction(
      database,
      [STORE.contextPresets],
      'readonly',
      async (tx) =>
        this.listStoreRecords<ContextPreset>(
          tx.objectStore(STORE.contextPresets),
          options.includeArchived ?? false,
        ),
    );
  }

  async close(): Promise<void> {
    if (!this.databasePromise) {
      return;
    }

    const database = await this.databasePromise;
    database.close();
    this.databasePromise = null;
  }

  async destroy(): Promise<void> {
    await this.close();
    const request = this.factory.deleteDatabase(this.databaseName);
    await requestToPromise(request);
  }

  private async getDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = this.openDatabase();
    }
    return this.databasePromise;
  }

  private async openDatabase(): Promise<IDBDatabase> {
    const request = this.factory.open(this.databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE.vaultItems)) {
        database.createObjectStore(STORE.vaultItems, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE.workspaceItems)) {
        const workspaceStore = database.createObjectStore(
          STORE.workspaceItems,
          { keyPath: 'id' },
        );
        workspaceStore.createIndex(INDEX.workspaceExpiresAt, 'expiresAt');
      }
      if (!database.objectStoreNames.contains(STORE.labels)) {
        database.createObjectStore(STORE.labels, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE.contextPresets)) {
        database.createObjectStore(STORE.contextPresets, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE.meta)) {
        const metaStore = database.createObjectStore(STORE.meta, {
          keyPath: 'key',
        });
        metaStore.put(toMetaRecord(DEFAULT_META));
      }
    };

    const database = await requestToPromise(request);
    database.onversionchange = () => database.close();
    await this.ensureMeta(database);
    return database;
  }

  private async ensureMeta(database: IDBDatabase): Promise<void> {
    await runTransaction(
      database,
      [
        STORE.meta,
        STORE.vaultItems,
        STORE.workspaceItems,
      ],
      'readwrite',
      async (tx) => {
        const store = tx.objectStore(STORE.meta);
        const existing = await requestToPromise(
          store.get(META_KEY) as IDBRequest<MetaRecord | undefined>,
        );
        if (existing === undefined) {
          store.put(toMetaRecord(DEFAULT_META));
          return;
        }

        const current = fromMetaRecord(existing);
        if (current.schemaVersion !== STORAGE_SCHEMA_VERSION) {
          tx.objectStore(STORE.vaultItems).clear();
          tx.objectStore(STORE.workspaceItems).clear();
          store.put(
            toMetaRecord({
              ...DEFAULT_META,
              schemaVersion: STORAGE_SCHEMA_VERSION,
            }),
          );
        }
      },
    );
  }

  private async mutate<T>(
    storeNames: string[],
    operation: (
      transaction: IDBTransaction,
    ) => Promise<MutationOperationResult<T>>,
    options?: {
      expectedDataRevision?: number;
      onConflict?: () => T;
    },
  ): Promise<MutationResult & { value: T }> {
    const database = await this.getDatabase();
    return runTransaction(
      database,
      uniqueStoreNames([...storeNames, STORE.meta]),
      'readwrite',
      async (tx) => {
        const metaStore = tx.objectStore(STORE.meta);
        const record = await requestToPromise(
          metaStore.get(META_KEY) as IDBRequest<MetaRecord | undefined>,
        );
        const current = fromMetaRecord(record);
        if (
          options?.expectedDataRevision !== undefined &&
          current.dataRevision !== options.expectedDataRevision
        ) {
          if (!options.onConflict) {
            throw new Error('Missing conflict result for conditional mutation');
          }
          return {
            changed: false,
            dataRevision: current.dataRevision,
            value: options.onConflict(),
          };
        }

        const operationResult = await operation(tx);

        if (!operationResult.changed) {
          return {
            changed: false,
            dataRevision: current.dataRevision,
            value: operationResult.value,
          };
        }

        const next = {
          ...current,
          schemaVersion: STORAGE_SCHEMA_VERSION,
          dataRevision: current.dataRevision + 1,
        };
        metaStore.put(toMetaRecord(next));

        return {
          changed: true,
          dataRevision: next.dataRevision,
          value: operationResult.value,
        };
      },
    );
  }

  private deleteExpiredWithCursor(
    store: IDBObjectStore,
    now: number,
  ): Promise<ItemReference[]> {
    return new Promise((resolve, reject) => {
      const removed: ItemReference[] = [];
      const request = store
        .index(INDEX.workspaceExpiresAt)
        .openCursor(IDBKeyRange.upperBound(now));

      request.onerror = () =>
        reject(request.error ?? new Error('Failed to scan expired records'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          removed.sort((left, right) => left.id.localeCompare(right.id));
          resolve(removed);
          return;
        }

        const item = cursor.value as WorkspaceItem;
        removed.push({ kind: 'workspace', id: item.id });
        cursor.delete();
        cursor.continue();
      };
    });
  }

  private async readSnapshotFromTransaction(
    tx: IDBTransaction,
    now: number,
  ): Promise<VaultSnapshot> {
    const [labels, contextPresets, vaultItems, workspaceItems] =
      await Promise.all([
        requestToPromise(
          tx.objectStore(STORE.labels).getAll() as IDBRequest<Label[]>,
        ),
        requestToPromise(
          tx
            .objectStore(STORE.contextPresets)
            .getAll() as IDBRequest<ContextPreset[]>,
        ),
        requestToPromise(
          tx.objectStore(STORE.vaultItems).getAll() as IDBRequest<VaultItem[]>,
        ),
        requestToPromise(
          tx
            .objectStore(STORE.workspaceItems)
            .getAll() as IDBRequest<WorkspaceItem[]>,
        ),
      ]);

    return {
      labels,
      contextPresets,
      records: [
        ...vaultItems.map((item): StoredRecord => ({ kind: 'vault', item })),
        ...workspaceItems
          .filter((item) => item.expiresAt > now)
          .map((item): StoredRecord => ({ kind: 'workspace', item })),
      ],
    };
  }

  private async listStoreRecords<
    T extends { archivedAt?: number },
  >(
    store: IDBObjectStore,
    includeArchived: boolean,
  ): Promise<T[]> {
    const records = await requestToPromise(store.getAll() as IDBRequest<T[]>);
    return includeArchived
      ? records
      : records.filter((record) => record.archivedAt === undefined);
  }

  private async putItemIfUnchanged<
    T extends { id: string; updatedAt: number },
  >(
    store: IDBObjectStore,
    item: T,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationOutcome> {
    const existing = await requestToPromise(
      store.get(item.id) as IDBRequest<T | undefined>,
    );

    if (!existing) {
      return 'not-found';
    }

    if (existing.updatedAt !== expectedUpdatedAt) {
      return 'conflict';
    }

    store.put(item);
    return 'updated';
  }
}
