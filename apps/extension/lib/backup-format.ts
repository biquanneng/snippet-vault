// SPDX-License-Identifier: MPL-2.0

import { Document, isAlias, isMap, parseDocument, visit } from 'yaml';

import {
  type Label,
  type StoredRecord,
  type VaultItem,
} from './core/model';
import { MAX_LABELS_PER_ITEM, migrateLegacyContexts, type LegacyContextPreset, type LegacyStoredRecord } from './core/context-migration';
import type { EnvironmentValue } from './localized-values';

const CONTEXT_COLORS = ['slate', 'blue', 'cyan', 'green', 'amber', 'orange', 'red', 'purple'] as const;

export const BACKUP_FORMAT = 'snippet-vault-export';
export const BACKUP_FORMAT_VERSION = 2;

const MAX_ID_LENGTH = 200;
// Legacy contexts allowed 500-character names. Converted labels must remain
// exportable; the interactive label-creation contract retains its 50-char limit.
const MAX_LABEL_NAME_LENGTH = 500;
const MAX_CONTEXT_PRESET_NAME_LENGTH = 500;
const MAX_CONTENT_LENGTH = 100_000;
const MAX_SOURCE_TITLE_LENGTH = 500;
const MAX_SOURCE_URL_LENGTH = 2_048;
const MAX_SOURCE_DOMAIN_LENGTH = 253;
const MAX_LABELS = 10_000;
const MAX_CONTEXT_PRESETS = 10_000;
const MAX_ITEMS = 100_000;

const CONTEXT_ENVIRONMENTS = [
  'development',
  'test',
  'staging',
  'production',
] as const satisfies readonly EnvironmentValue[];

export type BackupFormatErrorCode =
  | 'encrypted'
  | 'invalid'
  | 'unsupported';

export class BackupFormatError extends Error {
  readonly name = 'BackupFormatError';

  constructor(
    readonly code: BackupFormatErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface BackupSnapshot {
  labels: Label[];
  records: StoredRecord[];
}

export interface ParsedBackup {
  formatVersion: 1 | 2;
  snapshot: BackupSnapshot;
  exportedAt: number;
}

export interface BackupSerializationOptions {
  exportedAt?: number;
}

interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  exportedAt: string;
  labels: ExportedLabel[];
  items: ExportedItem[];
}

interface ExportedLabel {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ExportedBaseItem {
  id: string;
  content: string;
  labelIds: string[];
  source?: {
    title?: string;
    url?: string;
    domain?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ExportedVaultItem extends ExportedBaseItem {
  kind: 'vault';
  pinned: boolean;
  lastUsedAt?: string;
}

interface ExportedWorkspaceItem extends ExportedBaseItem {
  kind: 'workspace';
  expiresAt: string;
}

type ExportedItem = ExportedVaultItem | ExportedWorkspaceItem;

/** Serializes a validated v2 backup as deterministic plaintext YAML. */
export function serializeBackup(
  snapshot: BackupSnapshot,
  options: BackupSerializationOptions = {},
): string {
  const exportedAt = options.exportedAt ?? Date.now();
  assertFiniteTimestamp(exportedAt, 'exportedAt');

  const document = toBackupDocument(snapshot, exportedAt);
  // Parsing the emitted form keeps the serializer and importer under one
  // invariant, including cross-record references.
  const yaml = new Document(document, {
    schema: 'core',
    aliasDuplicateObjects: false,
    customTags: (tags) => tags.map((tag) => {
      if (typeof tag !== 'object' || tag.tag !== 'tag:yaml.org,2002:str' || !tag.stringify) return tag;
      const stringify = tag.stringify;
      return {
        ...tag,
        stringify(item, context, onComment, onChompKeep) {
          const value = item.value;
          // yaml otherwise quotes a value ending in a whitespace-only line.
          // An explicit indentation indicator and strip chomping preserve it
          // in literal style. Control characters still use yaml's quoted form.
          if (typeof value === 'string' && /\n[\t ]+$/.test(value) &&
              !/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(value)) {
            return `|2-\n${context.indent}${value.replace(/\n/g, `\n${context.indent}`)}`;
          }
          return stringify(item, context, onComment, onChompKeep);
        },
      };
    }),
  });
  const serialized = yaml.toString({
    blockQuote: 'literal',
    lineWidth: 0,
    doubleQuotedAsJSON: true,
  });
  parseBackup(serialized);
  return serialized;
}

/** v1 JSON remains readable, including legacy contexts; exports use v2 YAML. */
export function parseBackup(serialized: string): ParsedBackup {
  if (typeof serialized !== 'string' || serialized.trim().length === 0) {
    throw backupError('invalid', 'Backup data must be JSON or YAML text.');
  }
  return parseBackupDocument(
    serialized.trimStart().startsWith('{') ? parseJson(serialized) : parseYaml(serialized),
  );
}

function toBackupDocument(snapshot: BackupSnapshot, exportedAt: number): BackupDocument {
  assertObject(snapshot, 'snapshot');
  assertArray(snapshot.labels, 'snapshot.labels');
  assertArray(snapshot.records, 'snapshot.records');

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: toIsoTimestamp(exportedAt, 'exportedAt'),
    labels: snapshot.labels.map(toExportedLabel),
    items: snapshot.records.map(toExportedItem),
  };
}

function toExportedLabel(label: Label): ExportedLabel {
  return {
    id: label.id,
    name: label.name,
    usageCount: label.usageCount,
    ...(label.lastUsedAt === undefined
      ? {}
      : { lastUsedAt: toIsoTimestamp(label.lastUsedAt, 'label.lastUsedAt') }),
    ...(label.archivedAt === undefined
      ? {}
      : { archivedAt: toIsoTimestamp(label.archivedAt, 'label.archivedAt') }),
    createdAt: toIsoTimestamp(label.createdAt, 'label.createdAt'),
    updatedAt: toIsoTimestamp(label.updatedAt, 'label.updatedAt'),
  };
}

function toExportedItem(record: StoredRecord): ExportedItem {
  const item = record.item;
  return {
    id: item.id,
    ...(record.kind === 'vault'
      ? {
          kind: 'vault',
          labelIds: [...item.labelIds],
          pinned: record.item.pinned,
          ...(record.item.lastUsedAt === undefined
            ? {}
            : { lastUsedAt: toIsoTimestamp(record.item.lastUsedAt, 'item.lastUsedAt') }),
        }
      : {
          kind: 'workspace',
          labelIds: [...item.labelIds],
          expiresAt: toIsoTimestamp(record.item.expiresAt, 'item.expiresAt'),
        }),
    ...(item.source === undefined
      ? {}
      : {
          source: {
            ...(item.source.title === undefined ? {} : { title: item.source.title }),
            ...(item.source.url === undefined ? {} : { url: item.source.url }),
            ...(item.source.domain === undefined ? {} : { domain: item.source.domain }),
          },
        }),
    createdAt: toIsoTimestamp(item.createdAt, 'item.createdAt'),
    updatedAt: toIsoTimestamp(item.updatedAt, 'item.updatedAt'),
    content: item.content,
  };
}

function parseBackupDocument(value: unknown): ParsedBackup {
  const document = assertExactObject(value, 'backup', [
    'format',
    'formatVersion',
    'exportedAt',
    'labels',
    'contextPresets',
    'items',
  ]);
  if (document.format !== BACKUP_FORMAT) {
    throw backupError('invalid', 'This is not a SnippetVault backup.');
  }
  assertFormatVersion(document.formatVersion);

  const exportedAt = parseIsoTimestamp(document.exportedAt, 'exportedAt');
  assertArray(document.labels, 'labels');
  const legacyPresets = document.contextPresets === undefined ? [] : document.contextPresets;
  assertArray(legacyPresets, 'contextPresets');
  assertArray(document.items, 'items');
  assertMaximumLength(document.labels, MAX_LABELS, 'labels');
  assertMaximumLength(
    legacyPresets,
    MAX_CONTEXT_PRESETS,
    'contextPresets',
  );
  assertMaximumLength(document.items, MAX_ITEMS, 'items');

  const labels = document.labels.map((label, index) =>
    parseLabel(label, `labels[${index}]`),
  );
  const contextPresets = legacyPresets.map((preset, index) =>
    parseContextPreset(preset, `contextPresets[${index}]`),
  );
  const records = document.items.map((item, index) =>
    parseRecord(item, `items[${index}]`),
  );
  assertUnique(contextPresets.map((preset) => preset.id), 'contextPresets');
  const snapshot = migrateLegacyContexts({ labels, contextPresets, records });
  validateSnapshot(snapshot);
  return { snapshot, exportedAt, formatVersion: document.formatVersion };
}

function parseLabel(value: unknown, path: string): Label {
  const label = assertExactObject(value, path, [
    'id',
    'name',
    'usageCount',
    'lastUsedAt',
    'archivedAt',
    'createdAt',
    'updatedAt',
  ]);
  assertRequiredKeys(label, path, ['id', 'name', 'usageCount', 'createdAt', 'updatedAt']);
  const createdAt = parseIsoTimestamp(label.createdAt, `${path}.createdAt`);
  const updatedAt = parseIsoTimestamp(label.updatedAt, `${path}.updatedAt`);
  assertTimestampOrder(createdAt, updatedAt, path);
  return {
    id: parseId(label.id, `${path}.id`),
    name: parseText(label.name, `${path}.name`, MAX_LABEL_NAME_LENGTH),
    usageCount: parseNonNegativeInteger(label.usageCount, `${path}.usageCount`),
    ...(label.lastUsedAt === undefined
      ? {}
      : { lastUsedAt: parseIsoTimestamp(label.lastUsedAt, `${path}.lastUsedAt`) }),
    ...(label.archivedAt === undefined
      ? {}
      : { archivedAt: parseIsoTimestamp(label.archivedAt, `${path}.archivedAt`) }),
    createdAt,
    updatedAt,
  };
}

function parseContextPreset(value: unknown, path: string): LegacyContextPreset {
  const preset = assertExactObject(value, path, [
    'id',
    'name',
    'color',
    'environment',
    'archivedAt',
    'createdAt',
    'updatedAt',
  ]);
  assertRequiredKeys(preset, path, ['id', 'name', 'createdAt', 'updatedAt']);
  const createdAt = parseIsoTimestamp(preset.createdAt, `${path}.createdAt`);
  const updatedAt = parseIsoTimestamp(preset.updatedAt, `${path}.updatedAt`);
  assertTimestampOrder(createdAt, updatedAt, path);
  return {
    id: parseId(preset.id, `${path}.id`),
    name: parseText(preset.name, `${path}.name`, MAX_CONTEXT_PRESET_NAME_LENGTH),
    ...(preset.color === undefined
      ? {}
      : { color: parseEnum(preset.color, CONTEXT_COLORS, `${path}.color`) }),
    ...(preset.environment === undefined
      ? {}
      : {
          environment: parseEnum(
            preset.environment,
            CONTEXT_ENVIRONMENTS,
            `${path}.environment`,
          ),
        }),
    ...(preset.archivedAt === undefined
      ? {}
      : { archivedAt: parseIsoTimestamp(preset.archivedAt, `${path}.archivedAt`) }),
    createdAt,
    updatedAt,
  };
}

function parseRecord(value: unknown, path: string): LegacyStoredRecord {
  const candidate = assertObject(value, path);
  if (candidate.kind === 'vault') {
    const item = parseBaseItem(candidate, path, ['kind', 'pinned', 'lastUsedAt']);
    assertRequiredKeys(candidate, path, ['kind', 'pinned']);
    return {
      kind: 'vault',
      item: {
        ...item,
        pinned: parseBoolean(candidate.pinned, `${path}.pinned`),
        ...(candidate.lastUsedAt === undefined
          ? {}
          : {
              lastUsedAt: parseIsoTimestamp(
                candidate.lastUsedAt,
                `${path}.lastUsedAt`,
              ),
            }),
      },
    };
  }
  if (candidate.kind === 'workspace') {
    const item = parseBaseItem(candidate, path, ['kind', 'expiresAt']);
    assertRequiredKeys(candidate, path, ['kind', 'expiresAt']);
    return {
      kind: 'workspace',
      item: {
        ...item,
        expiresAt: parseIsoTimestamp(candidate.expiresAt, `${path}.expiresAt`),
      },
    };
  }
  throw backupError('invalid', `${path}.kind must be vault or workspace.`);
}

function parseBaseItem(
  value: Record<string, unknown>,
  path: string,
  kindKeys: string[],
): Omit<VaultItem, 'pinned' | 'lastUsedAt'> & { contextId?: string } {
  const item = assertExactObject(value, path, [
    'id',
    'content',
    'labelIds',
    'contextId',
    'source',
    'createdAt',
    'updatedAt',
    ...kindKeys,
  ]);
  assertRequiredKeys(item, path, ['id', 'content', 'labelIds', 'createdAt', 'updatedAt']);
  const createdAt = parseIsoTimestamp(item.createdAt, `${path}.createdAt`);
  const updatedAt = parseIsoTimestamp(item.updatedAt, `${path}.updatedAt`);
  assertTimestampOrder(createdAt, updatedAt, path);
  assertArray(item.labelIds, `${path}.labelIds`);
  if (item.labelIds.length > MAX_LABELS_PER_ITEM) {
    throw backupError('invalid', `${path}.labelIds has too many values.`);
  }
  const labelIds = item.labelIds.map((id, index) =>
    parseId(id, `${path}.labelIds[${index}]`),
  );
  assertUnique(labelIds, `${path}.labelIds`);
  return {
    id: parseId(item.id, `${path}.id`),
    content: parseContent(item.content, `${path}.content`),
    labelIds,
    ...(item.contextId === undefined
      ? {}
      : { contextId: parseId(item.contextId, `${path}.contextId`) }),
    ...(item.source === undefined
      ? {}
      : { source: parseSource(item.source, `${path}.source`) }),
    createdAt,
    updatedAt,
  };
}

function parseSource(
  value: unknown,
  path: string,
): NonNullable<VaultItem['source']> {
  const source = assertExactObject(value, path, ['title', 'url', 'domain']);
  if (Object.keys(source).length === 0) {
    throw backupError('invalid', `${path} cannot be empty.`);
  }
  const title = source.title === undefined
    ? undefined
    : parseText(source.title, `${path}.title`, MAX_SOURCE_TITLE_LENGTH);
  const url = source.url === undefined
    ? undefined
    : parseSourceUrl(source.url, `${path}.url`);
  const domain = source.domain === undefined
    ? undefined
    : parseDomain(source.domain, `${path}.domain`);
  if (url && domain && new URL(url).hostname !== domain) {
    throw backupError('invalid', `${path}.domain must match ${path}.url.`);
  }
  return {
    ...(title === undefined ? {} : { title }),
    ...(url === undefined ? {} : { url }),
    ...(domain === undefined ? {} : { domain }),
  };
}

function validateSnapshot(snapshot: BackupSnapshot): void {
  assertUnique(snapshot.labels.map((label) => label.id), 'labels');
  assertUnique(
    snapshot.records
      .filter((record) => record.kind === 'vault')
      .map((record) => record.item.id),
    'vault items',
  );
  assertUnique(
    snapshot.records
      .filter((record) => record.kind === 'workspace')
      .map((record) => record.item.id),
    'workspace items',
  );

  const labelIds = new Set(snapshot.labels.map((label) => label.id));
  for (const record of snapshot.records) {
    for (const labelId of record.item.labelIds) {
      if (!labelIds.has(labelId)) {
        throw backupError('invalid', `Item ${record.item.id} references an unknown label.`);
      }
    }
  }
}

function parseYaml(serialized: string): unknown {
  try {
    // parseDocument rejects trailing documents. Disable YAML 1.1 tag resolution
    // even when a document supplies directives, and never expand aliases.
    const document = parseDocument(serialized, {
      schema: 'core',
      customTags: [],
      resolveKnownTags: false,
      merge: false,
      uniqueKeys: true,
      stringKeys: true,
      strict: true,
      version: '1.2',
    });
    if (document.errors.length || document.warnings.length || !isMap(document.contents)) {
      throw backupError('invalid', 'Backup data must be a single YAML mapping.');
    }
    const coreTags = new Set([
      'tag:yaml.org,2002:map', 'tag:yaml.org,2002:seq',
      'tag:yaml.org,2002:str', 'tag:yaml.org,2002:null',
      'tag:yaml.org,2002:bool', 'tag:yaml.org,2002:int', 'tag:yaml.org,2002:float',
    ]);
    visit(document, {
      Node(_key, node) {
        if (isAlias(node) || (node.tag && !coreTags.has(node.tag))) {
          throw backupError('invalid', 'Backup YAML cannot contain aliases or non-core tags.');
        }
      },
    });
    const value: unknown = document.toJS({ maxAliasCount: 0 });
    if (Object.hasOwn(assertObject(value, 'backup'), 'encryption')) {
      throw backupError('encrypted', 'Decrypt this backup before importing it.');
    }
    return value;
  } catch (error) {
    if (error instanceof BackupFormatError) throw error;
    throw backupError('invalid', 'Backup data is not valid YAML.');
  }
}

function parseJson(serialized: string): unknown {
  if (typeof serialized !== 'string' || serialized.length === 0) {
    throw backupError('invalid', 'Backup data must be JSON text.');
  }
  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    throw backupError('invalid', 'Backup data is not valid JSON.');
  }
}

function assertFormatVersion(value: unknown): asserts value is 1 | 2 {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw backupError('invalid', 'Backup formatVersion must be an integer.');
  }
  if (value > BACKUP_FORMAT_VERSION) {
    throw backupError('unsupported', 'This backup was created by a newer SnippetVault version.');
  }
  if (value !== 1 && value !== 2) {
    throw backupError('unsupported', 'This backup format version is unsupported.');
  }
}

function parseIsoTimestamp(value: unknown, path: string): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw backupError('invalid', `${path} must be an ISO-8601 timestamp.`);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw backupError('invalid', `${path} must be a valid ISO-8601 timestamp.`);
  }
  return timestamp;
}

function toIsoTimestamp(value: unknown, path: string): string {
  assertFiniteTimestamp(value, path);
  try {
    return new Date(value).toISOString();
  } catch {
    throw backupError('invalid', `${path} must be a finite timestamp.`);
  }
}

function assertFiniteTimestamp(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw backupError('invalid', `${path} must be a finite timestamp.`);
  }
}

function parseSourceUrl(value: unknown, path: string): string {
  const url = parseText(value, path, MAX_SOURCE_URL_LENGTH);
  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.href !== url) {
      throw new Error('invalid source URL');
    }
    return url;
  } catch {
    throw backupError('invalid', `${path} must be a normalized HTTP(S) URL.`);
  }
}

function parseDomain(value: unknown, path: string): string {
  const domain = parseText(value, path, MAX_SOURCE_DOMAIN_LENGTH);
  if (domain !== domain.toLowerCase() || /[\s/:@]/.test(domain)) {
    throw backupError('invalid', `${path} must be a normalized hostname.`);
  }
  try {
    if (new URL(`https://${domain}`).hostname !== domain) {
      throw new Error('invalid domain');
    }
  } catch {
    throw backupError('invalid', `${path} must be a normalized hostname.`);
  }
  return domain;
}

function parseId(value: unknown, path: string): string {
  return parseText(value, path, MAX_ID_LENGTH);
}

function parseContent(value: unknown, path: string): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > MAX_CONTENT_LENGTH
  ) {
    throw backupError(
      'invalid',
      `${path} must contain between 1 and ${MAX_CONTENT_LENGTH} characters.`,
    );
  }
  return value;
}

function parseText(value: unknown, path: string, maximumLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength || value.trim() !== value) {
    throw backupError('invalid', `${path} must be non-empty normalized text.`);
  }
  return value;
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw backupError('invalid', `${path} must be a non-negative integer.`);
  }
  return value;
}

function parseBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw backupError('invalid', `${path} must be a boolean.`);
  }
  return value;
}

function parseEnum<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw backupError('invalid', `${path} is not supported.`);
  }
  return value as T;
}

function assertTimestampOrder(createdAt: number, updatedAt: number, path: string): void {
  if (updatedAt < createdAt) {
    throw backupError('invalid', `${path}.updatedAt cannot precede createdAt.`);
  }
}

function assertUnique(values: string[], path: string): void {
  if (new Set(values).size !== values.length) {
    throw backupError('invalid', `${path} contains duplicate IDs.`);
  }
}

function assertObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw backupError('invalid', `${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertExactObject(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
): Record<string, unknown> {
  const object = assertObject(value, path);
  for (const key of Object.keys(object)) {
    if (!allowedKeys.includes(key)) {
      throw backupError('invalid', `${path} contains an unknown field.`);
    }
  }
  return object;
}

function assertRequiredKeys(
  object: Record<string, unknown>,
  path: string,
  requiredKeys: readonly string[],
): void {
  for (const key of requiredKeys) {
    if (!(key in object) || object[key] === undefined) {
      throw backupError('invalid', `${path}.${key} is required.`);
    }
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw backupError('invalid', `${path} must be an array.`);
  }
}

function assertMaximumLength(
  value: unknown[],
  maximumLength: number,
  path: string,
): void {
  if (value.length > maximumLength) {
    throw backupError('invalid', `${path} has too many entries.`);
  }
}

function backupError(code: BackupFormatErrorCode, message: string): BackupFormatError {
  return new BackupFormatError(code, message);
}
