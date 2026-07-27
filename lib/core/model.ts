// SPDX-License-Identifier: MPL-2.0

export const STORAGE_SCHEMA_VERSION = 2;
export const SEARCH_SCHEMA_VERSION = 4;

export type ContextEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'production';

export const CONTEXT_COLORS = [
  'slate',
  'blue',
  'cyan',
  'green',
  'amber',
  'orange',
  'red',
  'purple',
] as const;

export type ContextColor = (typeof CONTEXT_COLORS)[number];

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
  contextColor?: ContextColor;
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
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContextPreset {
  id: string;
  name: string;
  color?: ContextColor;
  environment?: ContextEnvironment;
  archivedAt?: number;
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

export type ConditionalMutationOutcome =
  | 'updated'
  | 'not-found'
  | 'conflict';

export interface ConditionalMutationResult extends MutationResult {
  outcome: ConditionalMutationOutcome;
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

export interface ConditionalMutationReceipt
  extends ConditionalMutationResult {
  searchStatus: SearchSynchronizationStatus;
}

export interface PruneReceipt extends PruneResult {
  searchStatus: SearchSynchronizationStatus;
}

export interface SearchResult {
  ref: ItemReference;
  item: VaultItem | WorkspaceItem;
}
