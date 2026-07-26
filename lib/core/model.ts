// SPDX-License-Identifier: MPL-2.0

export const STORAGE_SCHEMA_VERSION = 1;
export const SEARCH_SCHEMA_VERSION = 3;

export interface SourceMetadata {
  title?: string;
  url?: string;
  domain?: string;
}

interface BaseItem {
  id: string;
  content: string;
  labelIds: string[];
  context?: string;
  source?: SourceMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface VaultItem extends BaseItem {
  pinned: boolean;
  lastUsedAt?: number;
}

export interface WorkspaceItem extends BaseItem {
  expiresAt: number;
}

export interface Label {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface StorageMeta {
  schemaVersion: number;
  dataRevision: number;
  indexedRevision: number;
  searchSchemaVersion: number;
  migrationState?: string;
  lastExpiredCleanupAt?: number;
}

export type ItemKind = 'vault' | 'workspace';

export interface ItemReference {
  kind: ItemKind;
  id: string;
}

export type StoredRecord =
  | {
      kind: 'vault';
      item: VaultItem;
    }
  | {
      kind: 'workspace';
      item: WorkspaceItem;
    };

export interface MutationResult {
  changed: boolean;
  dataRevision: number;
}

export interface PruneResult extends MutationResult {
  removed: ItemReference[];
}

export type SearchSynchronizationStatus =
  | 'synchronized'
  | 'rebuild-required';

export interface MutationReceipt extends MutationResult {
  searchStatus: SearchSynchronizationStatus;
}

export interface PruneReceipt extends PruneResult {
  searchStatus: SearchSynchronizationStatus;
}

export interface SearchResult {
  ref: ItemReference;
  item: VaultItem | WorkspaceItem;
}
