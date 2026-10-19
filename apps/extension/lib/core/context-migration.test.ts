// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';
import { migrateLegacyContexts, MAX_LABELS_PER_ITEM, type LegacyContextPreset, type LegacyStoredRecord } from './context-migration';
import { ENVIRONMENT_DEFINITIONS, getBuiltInLabelAliases, getLocalizedLabelName } from '../localized-values';
import type { Label } from './model';

const preset: LegacyContextPreset = { id: 'ctx', name: 'Project', createdAt: 10, updatedAt: 20 };
const label: Label = { id: 'existing', name: '  pRoJeCt  ', usageCount: 7, createdAt: 1, updatedAt: 2 };
function record(contextId?: string, labelIds: string[] = []): LegacyStoredRecord {
  return { kind: 'vault', item: { id: 'item', content: 'synthetic', pinned: true, labelIds, ...(contextId === undefined ? {} : { contextId }), createdAt: 30, updatedAt: 40 } };
}

describe('legacy contexts to labels', () => {
  it('reuses case-insensitive trimmed names without modifying existing label metadata or input', () => {
    const input = { labels: [label], contextPresets: [{ ...preset, name: ' Project ' }], records: [record('ctx')] };
    const before = structuredClone(input);
    const result = migrateLegacyContexts(input);
    expect(result.labels).toEqual([label]);
    expect(result.records[0].item.labelIds).toEqual(['existing']);
    expect(input).toEqual(before);
  });

  it('creates archived labels on both item kinds with usage counts and preserves updatedAt', () => {
    const vault = record('ctx');
    const workspace: LegacyStoredRecord = { kind: 'workspace', item: { ...vault.item, id: 'temporary', expiresAt: 0 } };
    const result = migrateLegacyContexts({ labels: [], contextPresets: [{ ...preset, archivedAt: 25 }], records: [vault, workspace] });
    expect(result.labels).toEqual([{ ...preset, usageCount: 2, archivedAt: 25 }]);
    expect(result.records.map((entry) => entry.item.labelIds)).toEqual([['ctx'], ['ctx']]);
    for (const entry of result.records) {
      expect(entry.item.updatedAt).toBe(40);
      expect(entry.item).not.toHaveProperty('contextId');
    }
  });

  it.each(Object.keys(ENVIRONMENT_DEFINITIONS) as Array<keyof typeof ENVIRONMENT_DEFINITIONS>)('creates one localized built-in label for %s', (environment) => {
    const id = `environment:${environment}`;
    const result = migrateLegacyContexts({ labels: [], contextPresets: [{ ...preset, environment }, { ...preset, id: 'ctx2', environment }], records: [record('ctx'), record('ctx2')] });
    expect(result.labels).toEqual([{ id, name: ENVIRONMENT_DEFINITIONS[environment].canonicalContext, usageCount: 2, createdAt: 10, updatedAt: 20 }]);
    expect(result.records.map((entry) => entry.item.labelIds)).toEqual([[id], [id]]);
    const aliases = getBuiltInLabelAliases(id);
    expect(aliases).toContain(ENVIRONMENT_DEFINITIONS[environment].canonicalContext);
    expect(aliases).toContain(getLocalizedLabelName(id, '', 'en'));
    expect(aliases).toContain(getLocalizedLabelName(id, '', 'zh_CN'));
  });

  it('reuses existing environment IDs without overwriting their metadata', () => {
    const existing = { ...label, id: 'environment:production' };
    const result = migrateLegacyContexts({ labels: [existing], contextPresets: [{ ...preset, environment: 'production' }], records: [record('ctx')] });
    expect(result.labels).toEqual([existing]);
    expect(result.records[0].item.labelIds).toEqual([existing.id]);
  });

  it('leaves items without context unchanged and drops unreferenced presets', () => {
    const plain = record();
    expect(migrateLegacyContexts({ labels: [], contextPresets: [preset], records: [plain] })).toEqual({ labels: [], records: [plain] });
  });

  it('drops missing references without modifying any other field', () => {
    expect(migrateLegacyContexts({ labels: [], records: [record('missing')] })).toEqual({ labels: [], records: [record()] });
  });

  it('allocates a fresh ID when the preset ID collides with a different label', () => {
    const result = migrateLegacyContexts({ labels: [{ ...label, id: 'ctx', name: 'Other' }], contextPresets: [preset], records: [record('ctx')] }, () => 'fresh');
    expect(result.labels[1]).toEqual({ ...preset, id: 'fresh', usageCount: 1 });
    expect(result.records[0].item.labelIds).toEqual(['fresh']);
  });

  it('does not duplicate labels, respects the item limit, and is idempotent', () => {
    const fullIds = Array.from({ length: MAX_LABELS_PER_ITEM }, (_, index) => `label:${index}`);
    const result = migrateLegacyContexts({ labels: [], contextPresets: [preset], records: [record('ctx', ['ctx']), record('ctx', fullIds)] });
    expect(result.records[0].item.labelIds).toEqual(['ctx']);
    expect(result.records[1].item.labelIds).toEqual(fullIds);
    expect(result.labels[0].usageCount).toBe(1);
    expect(migrateLegacyContexts(result)).toEqual(result);
  });
});
