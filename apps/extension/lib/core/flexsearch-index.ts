// SPDX-License-Identifier: MPL-2.0

import type {
  Document,
  DocumentData,
  IndexedDB as FlexIndexedDb,
  MergedDocumentSearchResults,
} from 'flexsearch';

import {
  SEARCH_SCHEMA_VERSION,
  type ItemKind,
} from './model';
import {
  encodeSearchText,
  SEARCH_FIELD_BOUNDARY,
  splitSearchQuery,
} from './search-normalization';
import {
  SEARCH_FIELDS,
  type SearchDocument,
  type SearchHit,
  type SearchIndex,
} from './search-index';

interface FlexSearchIndexOptions {
  namespace?: string;
}

type FlexSearchModule = typeof import('flexsearch');
type FlexSearchRuntime = Pick<FlexSearchModule, 'Document'> & {
  IndexedDB: typeof FlexIndexedDb;
};
const INDEXED_TEXT_FIELD = {
  vault: 'vaultText',
  workspace: 'workspaceText',
} as const;
type IndexedSearchDocument = {
  id: string;
  vaultText: string;
  workspaceText: string;
} & DocumentData;
type PersistentDocumentIndex = Document<
  IndexedSearchDocument,
  false,
  FlexIndexedDb
>;

let flexSearchModulePromise: Promise<FlexSearchRuntime> | null = null;

async function loadFlexSearch(): Promise<FlexSearchRuntime> {
  if (!flexSearchModulePromise) {
    flexSearchModulePromise = loadFlexSearchWithWorkerIndexedDbSupport();
  }
  return flexSearchModulePromise;
}

async function loadFlexSearchWithWorkerIndexedDbSupport(): Promise<FlexSearchRuntime> {
  const scope = globalThis as unknown as {
    window?: unknown;
  };
  const needsWindowShim = scope.window === undefined;

  if (needsWindowShim) {
    Object.defineProperty(scope, 'window', {
      configurable: true,
      value: scope,
    });
  }

  try {
    const [flexSearch, indexedDbModule] = await Promise.all([
      import('flexsearch'),
      import('flexsearch/db/indexeddb'),
    ]);
    return {
      Document: flexSearch.Document,
      IndexedDB:
        indexedDbModule.default as unknown as FlexSearchRuntime['IndexedDB'],
    };
  } finally {
    if (needsWindowShim) {
      delete scope.window;
    }
  }
}

export class FlexSearchIndex implements SearchIndex {
  private readonly namespace: string;
  private readonly legacyNamespaces: string[];
  private index: PersistentDocumentIndex | null = null;
  private adapter: FlexIndexedDb | null = null;
  private opening: Promise<void> | null = null;

  constructor(options: FlexSearchIndexOptions = {}) {
    const namespaceBase = options.namespace ?? 'snippet-vault-search';
    this.namespace = `${namespaceBase}-schema-${SEARCH_SCHEMA_VERSION}`;
    this.legacyNamespaces = [
      options.namespace ?? 'snippet-vault-search-v1',
      ...Array.from(
        { length: SEARCH_SCHEMA_VERSION - 1 },
        (_, index) => `${namespaceBase}-schema-${index + 1}`,
      ),
    ];
  }

  async open(): Promise<void> {
    if (this.index) {
      return;
    }
    if (!this.opening) {
      this.opening = this.createAndMount().catch((error) => {
        this.opening = null;
        throw error;
      });
    }
    return this.opening;
  }

  async clear(): Promise<void> {
    const index = await this.getIndex();
    await index.clear();
  }

  upsert(document: SearchDocument): void {
    if (!this.index) {
      throw new Error('FlexSearch index must be opened before it is updated');
    }

    const searchText = SEARCH_FIELDS.map((field) => document[field]).join(
      SEARCH_FIELD_BOUNDARY,
    );
    this.index.update({
      id: document.id,
      vaultText: document.kind === 'vault' ? searchText : '',
      workspaceText: document.kind === 'workspace' ? searchText : '',
    });
  }

  remove(id: string): void {
    if (!this.index) {
      throw new Error('FlexSearch index must be opened before entries are removed');
    }
    this.index.remove(id);
  }

  async commit(): Promise<void> {
    const index = await this.getIndex();
    await index.commit();
  }

  async search(
    query: string,
    limit: number,
    kind?: ItemKind,
  ): Promise<SearchHit[]> {
    const queryTerms = [...new Set(splitSearchQuery(query))];
    if (queryTerms.length === 0 || limit <= 0) {
      return [];
    }

    const index = await this.getIndex();
    const encodedQuery = queryTerms.join(SEARCH_FIELD_BOUNDARY);
    if (kind) {
      const results = await index.search({
        query: encodedQuery,
        limit,
        pluck: INDEXED_TEXT_FIELD[kind],
      });

      return results.map((id) => ({
        id: String(id),
      }));
    }

    const results = (await index.search({
      query: encodedQuery,
      limit,
      merge: true,
    })) as MergedDocumentSearchResults<IndexedSearchDocument>;
    return results.slice(0, limit).map((result) => ({
      id: String(result.id),
    }));
  }

  async close(): Promise<void> {
    if (this.opening) {
      await this.opening.catch(() => undefined);
    }
    if (this.adapter) {
      await this.adapter.close();
    }
    this.index = null;
    this.adapter = null;
    this.opening = null;
  }

  async destroy(): Promise<void> {
    if (this.opening) {
      await this.opening.catch(() => undefined);
    }
    if (!this.adapter) {
      const { IndexedDB } = await loadFlexSearch();
      this.adapter = new IndexedDB(this.namespace);
    }

    await this.adapter.destroy();
    this.index = null;
    this.adapter = null;
    this.opening = null;
  }

  private async createAndMount(): Promise<void> {
    const { Document, IndexedDB } = await loadFlexSearch();
    await this.destroyLegacyIndexes(IndexedDB);
    const adapter = new IndexedDB(this.namespace);
    const index = new Document<
      IndexedSearchDocument,
      false,
      FlexIndexedDb
    >({
      commit: false,
      document: {
        id: 'id',
        store: false,
        index: Object.values(INDEXED_TEXT_FIELD).map((field) => ({
          field,
          tokenize: 'forward' as const,
          encode: encodeSearchText,
        })),
      },
    });

    if (typeof index.mount !== 'function') {
      throw new Error(
        'FlexSearch persistent bundle is unavailable: Document.mount is missing',
      );
    }
    await index.mount(adapter);
    this.adapter = adapter;
    this.index = index;
  }

  private async destroyLegacyIndexes(
    IndexedDB: FlexSearchRuntime['IndexedDB'],
  ): Promise<void> {
    for (const namespace of new Set(this.legacyNamespaces)) {
      if (namespace === this.namespace) {
        continue;
      }
      const adapter = new IndexedDB(namespace);
      await adapter.destroy().catch(() => undefined);
    }
  }

  private async getIndex(): Promise<PersistentDocumentIndex> {
    await this.open();
    if (!this.index) {
      throw new Error('FlexSearch index failed to initialize');
    }
    return this.index;
  }
}
