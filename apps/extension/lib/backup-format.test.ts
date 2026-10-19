// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';
import { parse as parseYaml, stringify } from 'yaml';

import {
  BACKUP_FORMAT_VERSION,
  BackupFormatError,
  parseBackup,
  serializeBackup,
  type BackupSnapshot,
} from './backup-format';

const createdAt = 1_725_000_000_000;
const updatedAt = createdAt + 1_000;

function createSnapshot(): BackupSnapshot {
  return {
    labels: [
      {
        id: 'token',
        name: 'Token',
        usageCount: 2,
        createdAt,
        updatedAt,
      },
    ],
    records: [
      {
        kind: 'vault',
        item: {
          id: 'vault-1',
          content: '  ## Deploy\n\n`sk-live-猫`  ',
          labelIds: ['token'],
          source: {
            title: '发布手册',
            url: 'https://console.example.com/runbooks/deploy',
            domain: 'console.example.com',
          },
          pinned: true,
          lastUsedAt: updatedAt,
          createdAt,
          updatedAt,
        },
      },
      {
        kind: 'workspace',
        item: {
          id: 'workspace-1',
          content: '临时命令：`pnpm compile`',
          labelIds: ['token'],
          expiresAt: updatedAt + 86_400_000,
          createdAt,
          updatedAt,
        },
      },
    ],
  };
}

function parseDocument(snapshot = createSnapshot()): Record<string, unknown> {
  return parseYaml(serializeBackup(snapshot, { exportedAt: updatedAt })) as Record<
    string,
    unknown
  >;
}

function expectBackupError(code: BackupFormatError['code']) {
  return expect.objectContaining({ code });
}

describe('backup-format', () => {
  it('round-trips Unicode and Markdown through the normalized plaintext format', () => {
    const snapshot = createSnapshot();
    const serialized = serializeBackup(snapshot, { exportedAt: updatedAt });
    const document = parseYaml(serialized) as Record<string, unknown>;

    expect(document).toMatchObject({
      format: 'snippet-vault-export',
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: new Date(updatedAt).toISOString(),
    });
    expect(document.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'vault', pinned: true }),
        expect.objectContaining({ kind: 'workspace', expiresAt: expect.any(String) }),
      ]),
    );
    expect(parseBackup(serialized)).toEqual({ snapshot, exportedAt: updatedAt, formatVersion: 2 });
  });

  it('rejects unsupported versions, broken references, duplicate IDs, and incompatible item fields', () => {
    const future = parseDocument();
    future.formatVersion = BACKUP_FORMAT_VERSION + 1;
    expect(() => parseBackup(JSON.stringify(future))).toThrowError(
      expectBackupError('unsupported'),
    );

    const brokenReference = parseDocument();
    const items = brokenReference.items as Array<Record<string, unknown>>;
    items[0].labelIds = ['missing-label'];
    expect(() => parseBackup(JSON.stringify(brokenReference))).toThrowError(
      expectBackupError('invalid'),
    );

    const duplicateId = parseDocument();
    const duplicateItems = duplicateId.items as Array<Record<string, unknown>>;
    duplicateItems.push(structuredClone(duplicateItems[0]));
    expect(() => parseBackup(JSON.stringify(duplicateId))).toThrowError(
      expectBackupError('invalid'),
    );

    const incompatibleFields = parseDocument();
    const incompatibleItems = incompatibleFields.items as Array<Record<string, unknown>>;
    incompatibleItems[0].expiresAt = new Date(updatedAt).toISOString();
    expect(() => parseBackup(JSON.stringify(incompatibleFields))).toThrowError(
      expectBackupError('invalid'),
    );
  });

  it('allows the two item stores to use the same stable ID', () => {
    const snapshot = createSnapshot();
    snapshot.records[1].item.id = snapshot.records[0].item.id;

    expect(parseBackup(serializeBackup(snapshot)).snapshot).toEqual(snapshot);
  });
});

describe('legacy v1 context imports', () => {
  it('converts contexts with the same reuse, archive, environment, missing-reference and timestamp rules', () => {
    const document = parseDocument();
    document.formatVersion = 1;
    const iso = new Date(createdAt).toISOString();
    document.contextPresets = [
      { id: 'custom', name: 'tOkEn', createdAt: iso, updatedAt: iso },
      { id: 'retired', name: 'Retired', archivedAt: iso, createdAt: iso, updatedAt: iso },
      { id: 'env', name: 'Production', environment: 'production', color: 'red', createdAt: iso, updatedAt: iso },
      { id: 'unused', name: 'Unused', createdAt: iso, updatedAt: iso },
    ];
    const original = (document.items as Array<Record<string, unknown>>)[0];
    document.items = ['custom', 'retired', 'env', 'missing'].map((contextId) => ({ ...original, id: contextId, contextId }));
    const parsed = parseBackup(JSON.stringify(document));
    expect(parsed.snapshot.labels).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'token', usageCount: 2 }),
      { id: 'retired', name: 'Retired', usageCount: 1, archivedAt: createdAt, createdAt, updatedAt: createdAt },
      { id: 'environment:production', name: '生产环境', usageCount: 1, createdAt, updatedAt: createdAt },
    ]));
    expect(parsed.snapshot.labels).toHaveLength(3);
    expect(parsed.snapshot.records.map((record) => record.item.labelIds)).toEqual([
      ['token'], ['token', 'retired'], ['token', 'environment:production'], ['token'],
    ]);
    for (const record of parsed.snapshot.records) {
      expect(record.item).not.toHaveProperty('contextId');
      expect(record.item.updatedAt).toBe(updatedAt);
    }
    expect(parsed.snapshot).not.toHaveProperty('contextPresets');
    const exported = serializeBackup(parsed.snapshot, { exportedAt: updatedAt });
    expect(exported).not.toContain('contextPresets');
    expect(exported).not.toContain('contextId');
    expect(parseBackup(exported).snapshot).toEqual(parsed.snapshot);
  });

  it('keeps long legacy names exportable after conversion', () => {
    const document = parseDocument();
    document.formatVersion = 1;
    const iso = new Date(createdAt).toISOString();
    document.contextPresets = [{ id: 'long', name: 'x'.repeat(500), createdAt: iso, updatedAt: iso }];
    (document.items as Array<Record<string, unknown>>)[0].contextId = 'long';
    const parsed = parseBackup(JSON.stringify(document));
    expect(parseBackup(serializeBackup(parsed.snapshot)).snapshot).toEqual(parsed.snapshot);
  });

  it('rejects malformed legacy taxonomy rather than treating it as absent', () => {
    const document = parseDocument();
    document.formatVersion = 1;
    document.contextPresets = null;
    expect(() => parseBackup(JSON.stringify(document))).toThrow(BackupFormatError);
  });
});


describe('v2 YAML', () => {
  it.each([
    '## Markdown\n\n# Heading\nkey: value\n---\n...\n"double" and \'single\' 😺',
    'first\nsecond',
    'first\nsecond\n',
    'first\nsecond\n\n\n',
    '  leading spaces\nnext',
    '\tleading tab\n\tsecond',
    'first \nsecond  ',
    'first\n  ',
    'CRLF\r\nsecond\r\n',
    'true', '0123', 'null', '1e3',
  ])('preserves content exactly: %j', (content) => {
    const snapshot = createSnapshot();
    snapshot.records[0].item.content = content;
    const serialized = serializeBackup(snapshot, { exportedAt: updatedAt });
    expect(parseBackup(serialized).snapshot).toEqual(snapshot);
    if (content.includes('\r')) expect(serialized).toContain('content: "CRLF\\r\\n');
    if (['true', '0123', 'null', '1e3'].includes(content)) {
      expect(serialized).toContain(`content: "${content}"`);
    }
  });

  it('uses deterministic ordered mappings and a literal block with content last', () => {
    const snapshot = createSnapshot();
    snapshot.records = [snapshot.records[0]];
    snapshot.records[0].item.content = 'line one\nline two\n';
    const serialized = serializeBackup(snapshot, { exportedAt: updatedAt });
    expect(serialized).toBe(serializeBackup(snapshot, { exportedAt: updatedAt }));
    expect(Object.keys(parseYaml(serialized))).toEqual([
      'format', 'formatVersion', 'exportedAt', 'labels', 'items',
    ]);
    expect(Object.keys(parseYaml(serialized).items[0])).toEqual([
      'id', 'kind', 'labelIds', 'pinned', 'lastUsedAt', 'source', 'createdAt', 'updatedAt', 'content',
    ]);
    expect(serialized).toMatch(/    content: \|\n      line one\n      line two\n$/);
    expect(serialized).not.toMatch(/[&*]a\d/);
    const workspace = parseYaml(serializeBackup(createSnapshot())).items[1];
    expect(Object.keys(workspace)).toEqual([
      'id', 'kind', 'labelIds', 'expiresAt', 'createdAt', 'updatedAt', 'content',
    ]);
  });

  it.each([
    ['line one\nline two', '|-'],
    ['line one\nline two\n', '|'],
    ['line one\nline two\n\n', '|+'],
    ['  line one\nline two', '|2-'],
    ['first\n  ', '|2-'],
    ['first\n\t', '|2-'],
  ])('uses the appropriate literal block chomping for %j', (content, indicator) => {
    const snapshot = createSnapshot();
    snapshot.records[0].item.content = content;
    expect(serializeBackup(snapshot)).toContain(`content: ${indicator}\n`);
  });

  it('imports v1 JSON with or without leading whitespace', () => {
    const document = parseDocument();
    document.formatVersion = 1;
    expect(parseBackup(` \n${JSON.stringify(document)}`)).toEqual({
      snapshot: createSnapshot(), exportedAt: updatedAt, formatVersion: 1,
    });
  });

  it.each([
    'items: &a [*a, *a, *a]',
    'a: &a [x, x]\nb: &b [*a, *a]\nitems: [*b, *b]',
    'items: [*missing]',
    'items: !!js/function "function () {}"',
    'items: !foo []',
    'items: !!binary YQ==',
    'exportedAt: !!timestamp 2026-10-19T08:00:00.000Z',
    'items: []\n---\nitems: []',
    'items: []\nitems: []',
    '- items',
    'null',
  ])('rejects unsafe or invalid YAML: %s', (serialized) => {
    expect(() => parseBackup(serialized)).toThrowError(expectBackupError('invalid'));
  });

  it('rejects encrypted envelopes before validating plaintext fields', () => {
    expect(() => parseBackup('format: snippet-vault-export\nformatVersion: 2\nencryption: {}\nciphertext: abc\n'))
      .toThrowError(expectBackupError('encrypted'));
  });

  it('applies version, length, reference and field validation to YAML', () => {
    const document = parseDocument();
    document.formatVersion = 3;
    expect(() => parseBackup(stringify(document))).toThrowError(expectBackupError('unsupported'));
    document.formatVersion = 2;
    const item = (document.items as Array<Record<string, unknown>>)[0];
    item.content = 'x'.repeat(100_001);
    expect(() => parseBackup(stringify(document))).toThrowError(expectBackupError('invalid'));
    item.content = 'valid';
    item.labelIds = ['missing'];
    expect(() => parseBackup(stringify(document))).toThrowError(expectBackupError('invalid'));
    item.labelIds = [];
    item.unknown = true;
    expect(() => parseBackup(stringify(document))).toThrowError(expectBackupError('invalid'));
  });

  it('preserves the existing rejection of whitespace-only content', () => {
    const snapshot = createSnapshot();
    snapshot.records[0].item.content = ' \n\t ';
    expect(() => serializeBackup(snapshot)).toThrowError(expectBackupError('invalid'));
  });
});
