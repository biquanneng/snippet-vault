// SPDX-License-Identifier: MPL-2.0

import {
  SEARCH_SCHEMA_VERSION,
  type ItemKind,
  type ItemReference,
  type Label,
  type MutationReceipt,
  type MutationResult,
  type PruneReceipt,
  type SearchResult,
  type StoredRecord,
  type VaultItem,
  type WorkspaceItem,
} from './model';
import type { VaultRepository } from './repository';
import {
  createSearchDocument,
  fromSearchDocumentId,
  toSearchDocumentId,
  type SearchIndex,
} from './search-index';

interface SnippetVaultServiceOptions {
  repository: VaultRepository;
  searchIndex: SearchIndex;
  clock?: () => number;
}

export interface SearchOptions {
  limit?: number;
  kind?: ItemKind;
}

export interface BrowseOptions {
  offset?: number;
  limit?: number;
}

export interface BrowsePage {
  results: SearchResult[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export class SnippetVaultService {
  private readonly repository: VaultRepository;
  private readonly searchIndex: SearchIndex;
  private readonly clock: () => number;
  private operationQueue: Promise<void> = Promise.resolve();
  private readyPromise: Promise<void> | null = null;

  constructor(options: SnippetVaultServiceOptions) {
    this.repository = options.repository;
    this.searchIndex = options.searchIndex;
    this.clock = options.clock ?? Date.now;
  }

  saveVaultItem(item: VaultItem): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      const indexReady = await this.tryEnsureReady();
      const mutation = await this.repository.putVaultItem(item);
      return this.synchronizeRecordMutation(
        mutation,
        indexReady,
        { kind: 'vault', item },
      );
    });
  }

  saveWorkspaceItem(item: WorkspaceItem): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      const indexReady = await this.tryEnsureReady();
      const mutation = await this.repository.putWorkspaceItem(item);
      return this.synchronizeRecordMutation(
        mutation,
        indexReady,
        { kind: 'workspace', item },
      );
    });
  }

  saveLabel(label: Label): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      await this.tryEnsureReady();
      const mutation = await this.repository.putLabel(label);
      return this.rebuildAfterMutation(mutation);
    });
  }

  deleteLabel(id: string): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      await this.tryEnsureReady();
      const mutation = await this.repository.deleteLabel(id);
      return this.rebuildAfterMutation(mutation);
    });
  }

  deleteItem(reference: ItemReference): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      const indexReady = await this.tryEnsureReady();
      const mutation = await this.repository.deleteItem(reference);
      if (!mutation.changed) {
        return this.toReceipt(mutation, 'synchronized');
      }
      if (!indexReady) {
        return this.toReceipt(mutation, 'rebuild-required');
      }

      return this.commitIndexMutation(mutation, () => {
        this.searchIndex.remove(toSearchDocumentId(reference));
      });
    });
  }

  promoteWorkspaceItem(
    workspaceId: string,
    vaultItem: VaultItem,
  ): Promise<MutationReceipt> {
    return this.enqueueOperation(async () => {
      const indexReady = await this.tryEnsureReady();
      const mutation = await this.repository.promoteWorkspaceItem(
        workspaceId,
        vaultItem,
      );
      if (!mutation.changed) {
        return this.toReceipt(mutation, 'synchronized');
      }
      if (!indexReady) {
        return this.toReceipt(mutation, 'rebuild-required');
      }

      try {
        const labels = await this.getLabelNames();
        return this.commitIndexMutation(mutation, () => {
          this.searchIndex.remove(
            toSearchDocumentId({ kind: 'workspace', id: workspaceId }),
          );
          this.searchIndex.upsert(
            createSearchDocument({ kind: 'vault', item: vaultItem }, labels),
          );
        });
      } catch {
        this.readyPromise = null;
        return this.toReceipt(mutation, 'rebuild-required');
      }
    });
  }

  pruneExpired(): Promise<PruneReceipt> {
    return this.enqueueOperation(async () => {
      const indexReady = await this.tryEnsureReady();
      const result = await this.repository.pruneExpired(this.clock());

      if (!result.changed) {
        return { ...result, searchStatus: 'synchronized' };
      }
      if (!indexReady) {
        return { ...result, searchStatus: 'rebuild-required' };
      }

      const receipt = await this.commitIndexMutation(result, () => {
        for (const reference of result.removed) {
          this.searchIndex.remove(toSearchDocumentId(reference));
        }
      });
      return {
        ...result,
        searchStatus: receipt.searchStatus,
      };
    });
  }

  getItem(reference: ItemReference): Promise<StoredRecord | null> {
    return this.repository.getItem(reference);
  }

  listLabels(): Promise<Label[]> {
    return this.repository.listLabels();
  }

  search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    return this.enqueueOperation(() => this.searchRecords(query, options));
  }

  browse(
    kind: ItemKind,
    options: BrowseOptions = {},
  ): Promise<BrowsePage> {
    return this.enqueueOperation(() => this.browseRecords(kind, options));
  }

  async close(): Promise<void> {
    await this.operationQueue;
    await Promise.all([this.searchIndex.close(), this.repository.close()]);
    this.readyPromise = null;
  }

  private async searchRecords(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const limit = Math.min(100, Math.max(1, options.limit ?? 50));
    const now = this.clock();

    if (!query.trim()) {
      return this.getDefaultResults(now, limit, options.kind);
    }

    await this.ensureReady();
    const hits = await this.searchIndex.search(
      query,
      limit,
      options.kind,
    );
    const references = hits
      .map((hit) => fromSearchDocumentId(hit.id))
      .filter((reference): reference is ItemReference => reference !== null);
    const records = await this.repository.getItems(references);
    const recordById = new Map(
      records.map((record) => [
        toSearchDocumentId({ kind: record.kind, id: record.item.id }),
        record,
      ]),
    );

    const matched: SearchResult[] = [];
    hits.forEach((hit) => {
      const record = recordById.get(hit.id);
      if (!record || this.isExpired(record, now)) {
        return;
      }
      matched.push({
        ref: { kind: record.kind, id: record.item.id },
        item: record.item,
      });
    });

    return matched.slice(0, limit);
  }

  private enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const pending = this.operationQueue.then(operation, operation);
    this.operationQueue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  private async tryEnsureReady(): Promise<boolean> {
    try {
      await this.ensureReady();
      return true;
    } catch {
      this.readyPromise = null;
      return false;
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.initializeSearch().catch((error) => {
        this.readyPromise = null;
        throw error;
      });
    }
    return this.readyPromise;
  }

  private async initializeSearch(): Promise<void> {
    await this.searchIndex.open();
    const meta = await this.repository.getMeta();
    if (
      meta.indexedRevision !== meta.dataRevision ||
      meta.searchSchemaVersion !== SEARCH_SCHEMA_VERSION
    ) {
      await this.rebuildIndex();
    }
  }

  private async rebuildIndex(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const meta = await this.repository.getMeta();
      const [records, labels] = await Promise.all([
        this.repository.listActiveRecords(this.clock()),
        this.getLabelNames(),
      ]);

      await this.searchIndex.clear();
      for (const record of records) {
        this.searchIndex.upsert(createSearchDocument(record, labels));
      }
      await this.searchIndex.commit();

      const marked = await this.repository.markSearchIndexed(
        meta.dataRevision,
        SEARCH_SCHEMA_VERSION,
      );
      if (marked) {
        return;
      }
    }

    throw new Error(
      'Vault data changed repeatedly while the search index was rebuilding',
    );
  }

  private async synchronizeRecordMutation(
    mutation: MutationResult,
    indexReady: boolean,
    record: StoredRecord,
  ): Promise<MutationReceipt> {
    if (!mutation.changed) {
      return this.toReceipt(mutation, 'synchronized');
    }
    if (!indexReady) {
      return this.toReceipt(mutation, 'rebuild-required');
    }

    try {
      const labels = await this.getLabelNames();
      return this.commitIndexMutation(mutation, () => {
        this.searchIndex.upsert(createSearchDocument(record, labels));
      });
    } catch {
      this.readyPromise = null;
      return this.toReceipt(mutation, 'rebuild-required');
    }
  }

  private async rebuildAfterMutation(
    mutation: MutationResult,
  ): Promise<MutationReceipt> {
    if (!mutation.changed) {
      return this.toReceipt(mutation, 'synchronized');
    }

    try {
      await this.searchIndex.open();
      await this.rebuildIndex();
      this.readyPromise = Promise.resolve();
      return this.toReceipt(mutation, 'synchronized');
    } catch {
      this.readyPromise = null;
      return this.toReceipt(mutation, 'rebuild-required');
    }
  }

  private async commitIndexMutation(
    mutation: MutationResult,
    apply: () => void,
  ): Promise<MutationReceipt> {
    try {
      apply();
      await this.searchIndex.commit();
      const marked = await this.repository.markSearchIndexed(
        mutation.dataRevision,
        SEARCH_SCHEMA_VERSION,
        mutation.dataRevision - 1,
      );
      if (!marked) {
        this.readyPromise = null;
        return this.toReceipt(mutation, 'rebuild-required');
      }
      return this.toReceipt(mutation, 'synchronized');
    } catch {
      this.readyPromise = null;
      return this.toReceipt(mutation, 'rebuild-required');
    }
  }

  private async getLabelNames(): Promise<Map<string, string>> {
    const labels = await this.repository.listLabels();
    return new Map(labels.map((label) => [label.id, label.name]));
  }

  private async getDefaultResults(
    now: number,
    limit: number,
    kind?: ItemKind,
  ): Promise<SearchResult[]> {
    const records = await this.getDefaultRecords(now, kind);
    return records
      .sort((left, right) => this.compareDefaultRecords(left, right))
      .slice(0, limit)
      .map((record) => ({
        ref: { kind: record.kind, id: record.item.id },
        item: record.item,
      }));
  }

  private async browseRecords(
    kind: ItemKind,
    options: BrowseOptions,
  ): Promise<BrowsePage> {
    const offset = Math.max(0, Math.floor(options.offset ?? 0));
    const limit = Math.min(
      50,
      Math.max(1, Math.floor(options.limit ?? 20)),
    );
    const records = await this.getDefaultRecords(this.clock(), kind);
    records.sort((left, right) => this.compareDefaultRecords(left, right));
    const results = records
      .slice(offset, offset + limit)
      .map((record) => ({
        ref: { kind: record.kind, id: record.item.id },
        item: record.item,
      }));

    return {
      results,
      total: records.length,
      offset,
      limit,
      hasMore: offset + results.length < records.length,
    };
  }

  private async getDefaultRecords(
    now: number,
    kind?: ItemKind,
  ): Promise<StoredRecord[]> {
    const records = await this.repository.listActiveRecords(now);
    return kind
      ? records.filter((record) => record.kind === kind)
      : records;
  }

  private compareDefaultRecords(left: StoredRecord, right: StoredRecord): number {
    if (left.kind !== right.kind) {
      return left.kind === 'workspace' ? -1 : 1;
    }
    if (left.kind === 'workspace' && right.kind === 'workspace') {
      return left.item.expiresAt - right.item.expiresAt;
    }
    if (left.kind === 'vault' && right.kind === 'vault') {
      if (left.item.pinned !== right.item.pinned) {
        return left.item.pinned ? -1 : 1;
      }
      return (
        (right.item.lastUsedAt ?? right.item.updatedAt) -
        (left.item.lastUsedAt ?? left.item.updatedAt)
      );
    }
    return 0;
  }

  private isExpired(record: StoredRecord, now: number): boolean {
    return record.kind === 'workspace' && record.item.expiresAt <= now;
  }

  private toReceipt(
    mutation: MutationResult,
    searchStatus: MutationReceipt['searchStatus'],
  ): MutationReceipt {
    return {
      ...mutation,
      searchStatus,
    };
  }
}
