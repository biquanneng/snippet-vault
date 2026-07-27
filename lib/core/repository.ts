// SPDX-License-Identifier: MPL-2.0

import type {
  ConditionalMutationResult,
  ContextPreset,
  ItemReference,
  Label,
  MutationResult,
  PruneResult,
  StorageMeta,
  StoredRecord,
  VaultItem,
  WorkspaceItem,
} from './model';

export interface VaultRepository {
  getMeta(): Promise<StorageMeta>;
  /**
   * Advances the derived index revision only if the business revision still
   * matches. Incremental updates also pass the revision they started from so
   * an interleaved writer cannot be skipped.
   */
  markSearchIndexed(
    dataRevision: number,
    searchSchemaVersion: number,
    expectedIndexedRevision?: number,
  ): Promise<boolean>;

  putVaultItem(item: VaultItem): Promise<MutationResult>;
  putWorkspaceItem(item: WorkspaceItem): Promise<MutationResult>;
  putVaultItemIfUnchanged(
    item: VaultItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationResult>;
  putWorkspaceItemIfUnchanged(
    item: WorkspaceItem,
    expectedUpdatedAt: number,
  ): Promise<ConditionalMutationResult>;
  putLabel(label: Label): Promise<MutationResult>;
  putContextPreset(preset: ContextPreset): Promise<MutationResult>;
  touchLabelUsage(id: string, time: number): Promise<MutationResult>;
  deleteItem(reference: ItemReference): Promise<MutationResult>;
  promoteWorkspaceItem(
    workspaceId: string,
    vaultItem: VaultItem,
  ): Promise<MutationResult>;
  pruneExpired(now: number): Promise<PruneResult>;

  getItem(reference: ItemReference): Promise<StoredRecord | null>;
  getItems(references: ItemReference[]): Promise<StoredRecord[]>;
  listActiveRecords(now: number): Promise<StoredRecord[]>;
  listLabels(options?: { includeArchived?: boolean }): Promise<Label[]>;
  listContextPresets(
    options?: { includeArchived?: boolean },
  ): Promise<ContextPreset[]>;

  close(): Promise<void>;
}
