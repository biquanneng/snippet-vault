// SPDX-License-Identifier: MPL-2.0

import { FlexSearchIndex } from './flexsearch-index';
import { IndexedDbVaultRepository } from './indexeddb-repository';
import { SnippetVaultService } from './vault-service';

export * from './model';
export * from './repository';
export * from './search-index';
export { FlexSearchIndex } from './flexsearch-index';
export { IndexedDbVaultRepository } from './indexeddb-repository';
export { SnippetVaultService } from './vault-service';

interface CreateSnippetVaultOptions {
  databaseName?: string;
  searchNamespace?: string;
  clock?: () => number;
}

export function createSnippetVaultService(
  options: CreateSnippetVaultOptions = {},
): SnippetVaultService {
  return new SnippetVaultService({
    repository: new IndexedDbVaultRepository({
      databaseName: options.databaseName,
    }),
    searchIndex: new FlexSearchIndex({
      namespace: options.searchNamespace,
    }),
    clock: options.clock,
  });
}
