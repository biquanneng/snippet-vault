// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

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
    contextPresets: [
      {
        id: 'context:production',
        name: '生产环境',
        color: 'red',
        environment: 'production',
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
          contextId: 'context:production',
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
  return JSON.parse(serializeBackup(snapshot, { exportedAt: updatedAt })) as Record<
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
    const document = JSON.parse(serialized) as Record<string, unknown>;

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
    expect(parseBackup(serialized)).toEqual({ snapshot, exportedAt: updatedAt });
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
