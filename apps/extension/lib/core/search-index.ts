// SPDX-License-Identifier: MPL-2.0

import type {
  ContextPreset,
  ItemKind,
  ItemReference,
  StoredRecord,
} from './model';
import {
  ENVIRONMENT_DEFINITIONS,
  getBuiltInLabelAliases,
  getLocalizedEnvironmentName,
} from '../localized-values';

export const SEARCH_FIELDS = [
  'labelText',
  'context',
  'sourceTitle',
  'sourceUrl',
  'sourceDomain',
  'content',
] as const;

export interface SearchDocument {
  id: string;
  kind: 'vault' | 'workspace';
  labelText: string;
  context: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  content: string;
}

export interface SearchHit {
  id: string;
}

export interface SearchIndex {
  open(): Promise<void>;
  clear(): Promise<void>;
  upsert(document: SearchDocument): void;
  remove(id: string): void;
  commit(): Promise<void>;
  search(query: string, limit: number, kind?: ItemKind): Promise<SearchHit[]>;
  close(): Promise<void>;
}

export function toSearchDocumentId(reference: ItemReference): string {
  return `${reference.kind}:${reference.id}`;
}

export function fromSearchDocumentId(id: string): ItemReference | null {
  if (id.startsWith('vault:')) {
    return { kind: 'vault', id: id.slice('vault:'.length) };
  }
  if (id.startsWith('workspace:')) {
    return { kind: 'workspace', id: id.slice('workspace:'.length) };
  }
  return null;
}

export function createSearchDocument(
  record: StoredRecord,
  labelNames: ReadonlyMap<string, string>,
  contextPresets: ReadonlyMap<string, ContextPreset>,
): SearchDocument {
  const source = record.item.source;
  const context = getContextSearchText(
    record.item.contextId,
    contextPresets,
  );
  return {
    id: toSearchDocumentId({ kind: record.kind, id: record.item.id }),
    kind: record.kind,
    labelText: record.item.labelIds
      .flatMap((labelId) => {
        const storedName = labelNames.get(labelId);
        return [
          ...(storedName ? [storedName] : []),
          ...getBuiltInLabelAliases(labelId),
        ];
      })
      .join(' '),
    context,
    sourceTitle: source?.title ?? '',
    sourceUrl: source?.url ?? '',
    sourceDomain: source?.domain ?? '',
    content: record.item.content,
  };
}

function getContextSearchText(
  contextId: string | undefined,
  contextPresets: ReadonlyMap<string, ContextPreset>,
): string {
  if (!contextId) {
    return '';
  }

  const preset = contextPresets.get(contextId);
  if (!preset) {
    return '';
  }

  return [
    preset.name,
    ...(preset.environment
      ? [
          ENVIRONMENT_DEFINITIONS[preset.environment].canonicalContext,
          getLocalizedEnvironmentName(preset.environment, 'en'),
          getLocalizedEnvironmentName(preset.environment, 'zh_CN'),
        ]
      : []),
  ]
    .filter(Boolean)
    .join(' ');
}
