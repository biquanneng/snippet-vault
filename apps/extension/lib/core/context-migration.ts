// SPDX-License-Identifier: MPL-2.0

import { ENVIRONMENT_DEFINITIONS, type EnvironmentValue } from '../localized-values';
import type { Label, StoredRecord, VaultSnapshot } from './model';

/** Legacy types are confined to the v3 / v1 import boundary. */
export interface LegacyContextPreset {
  id: string;
  name: string;
  environment?: EnvironmentValue;
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type LegacyStoredRecord =
  | { kind: 'vault'; item: Extract<StoredRecord, { kind: 'vault' }>['item'] & { contextId?: string } }
  | { kind: 'workspace'; item: Extract<StoredRecord, { kind: 'workspace' }>['item'] & { contextId?: string } };

export const MAX_LABELS_PER_ITEM = 100;

/** Pure conversion shared by the atomic IndexedDB upgrade and legacy JSON import.
 * Existing labels retain their metadata; usage counts on newly created labels
 * count migrated references, including references already present on an item.
 */
export function migrateLegacyContexts(
  snapshot: { labels: Label[]; contextPresets?: LegacyContextPreset[]; records: LegacyStoredRecord[] },
  createId: () => string = () => crypto.randomUUID(),
): VaultSnapshot {
  const labels = snapshot.labels.map((label) => ({ ...label }));
  const labelsById = new Map(labels.map((label) => [label.id, label]));
  const labelsByName = new Map<string, Label>();
  for (const label of labels) {
    const name = label.name.trim().toLowerCase();
    if (!labelsByName.has(name)) labelsByName.set(name, label);
  }
  const presets = new Map(snapshot.contextPresets?.map((preset) => [preset.id, preset]));
  const created = new Set<string>();
  const resolved = new Map<string, Label>();
  const records = snapshot.records.map((record): StoredRecord => {
    const { contextId, ...item } = record.item;
    item.labelIds = [...item.labelIds];
    const preset = contextId ? presets.get(contextId) : undefined;
    if (preset) {
      let label = resolved.get(preset.id);
      if (!label) {
        if (preset.environment && !Object.hasOwn(ENVIRONMENT_DEFINITIONS, preset.environment)) {
          throw new Error('Unsupported legacy environment');
        }
        const environmentId = preset.environment ? `environment:${preset.environment}` : undefined;
        label = environmentId
          ? labelsById.get(environmentId)
          : labelsByName.get(preset.name.trim().toLowerCase());
        if (!label) {
          let id = environmentId ?? preset.id;
          while (labelsById.has(id)) id = createId();
          label = {
            id,
            name: preset.environment ? ENVIRONMENT_DEFINITIONS[preset.environment].canonicalContext : preset.name,
            usageCount: 0,
            createdAt: preset.createdAt,
            updatedAt: preset.updatedAt,
            ...(preset.archivedAt === undefined ? {} : { archivedAt: preset.archivedAt }),
          };
          labels.push(label);
          labelsById.set(id, label);
          const name = label.name.trim().toLowerCase();
          if (!labelsByName.has(name)) labelsByName.set(name, label);
          created.add(id);
        }
        resolved.set(preset.id, label);
      }
      if (!item.labelIds.includes(label.id) && item.labelIds.length < MAX_LABELS_PER_ITEM) {
        item.labelIds.push(label.id);
      }
      if (created.has(label.id) && item.labelIds.includes(label.id)) label.usageCount += 1;
    }
    return { ...record, item } as StoredRecord;
  });
  return { labels, records };
}
