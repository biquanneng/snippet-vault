// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  MAX_BACKUP_CONTENT_LENGTH,
  MAX_CONTEXT_PRESET_NAME_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  hasExtensionMessageType,
  isExtensionRequest,
} from './message-contract';

describe('backup message contract', () => {
  it('accepts JSON export and bounded import inspection', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/export-backup',
      }),
    ).toBe(true);

    expect(
      isExtensionRequest({
        type: 'snippet-vault/inspect-backup',
        payload: { contents: '{"format":"snippet-vault-export"}' },
      }),
    ).toBe(true);

    expect(
      isExtensionRequest({
        type: 'snippet-vault/import-backup',
        payload: {
          contents: '{"format":"snippet-vault-export"}',
          expectedDataRevision: 7,
        },
      }),
    ).toBe(true);
  });

  it('rejects legacy export options and malformed or oversized files', () => {
    for (const message of [
      {
        type: 'snippet-vault/export-backup',
        payload: { mode: 'plaintext' },
      },
      {
        type: 'snippet-vault/inspect-backup',
        payload: { contents: '' },
      },
      {
        type: 'snippet-vault/inspect-backup',
        payload: { contents: '{}', passphrase: 'legacy' },
      },
      {
        type: 'snippet-vault/import-backup',
        payload: {
          contents: 'x'.repeat(MAX_BACKUP_CONTENT_LENGTH + 1),
          expectedDataRevision: 0,
        },
      },
      {
        type: 'snippet-vault/inspect-backup',
        payload: {
          contents: '猫'.repeat(
            Math.floor(MAX_BACKUP_CONTENT_LENGTH / 3) + 1,
          ),
        },
      },
      {
        type: 'snippet-vault/import-backup',
        payload: { contents: '{}', expectedDataRevision: -1 },
      },
    ]) {
      expect(isExtensionRequest(message)).toBe(false);
    }
  });
});

describe('create-label message contract', () => {
  it('accepts a trimmed label name within the limit', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/create-label',
        payload: { name: '  Database  ' },
      }),
    ).toBe(true);
  });

  it('rejects blank and overlong label names', () => {
    for (const name of ['   ', 'x'.repeat(MAX_LABEL_NAME_LENGTH + 1)]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-label',
          payload: { name },
        }),
      ).toBe(false);
    }
  });
});

describe('save-selection message contract', () => {
  it('accepts Markdown content with optional unique labels', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          content: '**deployment token**',
          labelIds: ['token', 'client-id'],
          temporary: false,
        },
      }),
    ).toBe(true);
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          content: 'unclassified secret',
          labelIds: [],
          temporary: false,
        },
      }),
    ).toBe(true);
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          content: 'one-time-code',
          labelIds: [],
          temporary: true,
          contextId: 'environment:test',
        },
      }),
    ).toBe(true);
  });

  it('rejects legacy and malformed label selections', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          content: '**deployment token**',
          labelId: 'token',
          temporary: false,
        },
      }),
    ).toBe(false);

    for (const labelIds of [
      undefined,
      'token',
      ['token', 'token'],
      ['token', ''],
      ['token', 7],
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/save-selection',
          payload: {
            content: '**deployment token**',
            labelIds,
            temporary: false,
          },
        }),
      ).toBe(false);
    }

    for (const payload of [
      {
        content: '**deployment token**',
        labelIds: ['token'],
        temporary: false,
        context: 'legacy',
      },
      {
        content: '**deployment token**',
        labelIds: ['token'],
        temporary: false,
        contextId: '',
      },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/save-selection',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('create-snippet message contract', () => {
  it('accepts Vault and Workspace targets with optional unique labels', () => {
    for (const kind of ['vault', 'workspace']) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-snippet',
          payload: {
            kind,
            content: '# Deployment\n\nKeep this value close.',
            labelIds: ['token', 'client-id'],
            contextId: 'environment:production',
          },
        }),
      ).toBe(true);
    }

    expect(
      isExtensionRequest({
        type: 'snippet-vault/create-snippet',
        payload: {
          kind: 'vault',
          content: 'unclassified secret',
          labelIds: [],
        },
      }),
    ).toBe(true);
  });

  it('rejects missing or unsupported targets', () => {
    for (const kind of [undefined, 'other']) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-snippet',
          payload: {
            kind,
            content: 'deployment token',
            labelIds: ['token'],
          },
        }),
      ).toBe(false);
    }
  });

  it('rejects legacy and malformed manual label selections', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/create-snippet',
        payload: {
          kind: 'vault',
          content: 'deployment token',
          labelId: 'token',
        },
      }),
    ).toBe(false);

    for (const labelIds of [
      undefined,
      'token',
      ['token', 'token'],
      ['token', ''],
      ['token', 7],
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-snippet',
          payload: {
            kind: 'vault',
            content: 'deployment token',
            labelIds,
          },
        }),
      ).toBe(false);
    }

    for (const payload of [
      {
        kind: 'vault',
        content: 'deployment token',
        labelIds: ['token'],
        context: 'legacy',
      },
      {
        kind: 'vault',
        content: 'deployment token',
        labelIds: ['token'],
        contextId: '',
      },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-snippet',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('management message contract', () => {
  it('accepts label and context management requests', () => {
    for (const message of [
      { type: 'snippet-vault/get-label-management' },
      {
        type: 'snippet-vault/rename-label',
        payload: { id: 'custom:1', name: 'Database' },
      },
      {
        type: 'snippet-vault/archive-label',
        payload: { id: 'custom:1' },
      },
      { type: 'snippet-vault/get-context-presets' },
      { type: 'snippet-vault/get-context-preset-management' },
      {
        type: 'snippet-vault/create-context-preset',
        payload: {
          name: 'Shared QA',
          environment: 'test',
          color: 'amber',
        },
      },
      {
        type: 'snippet-vault/rename-context-preset',
        payload: {
          id: 'context:1',
          name: 'Shared QA',
          color: 'purple',
        },
      },
      {
        type: 'snippet-vault/restore-context-preset',
        payload: { id: 'context:1' },
      },
    ]) {
      expect(isExtensionRequest(message)).toBe(true);
    }
  });

  it('rejects malformed context preset names, environments, and colors', () => {
    for (const payload of [
      { name: '   ' },
      { name: 'x'.repeat(MAX_CONTEXT_PRESET_NAME_LENGTH + 1) },
      { name: 'Shared QA', environment: 'prod' },
      { name: 'Shared QA', color: 'pink' },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/create-context-preset',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('search-panel message contract', () => {
  it('accepts a bounded search request with exact filters', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/search-panel',
        payload: {
          kind: 'workspace',
          query: 'deployment token',
          page: 0,
          pageSize: 20,
          contextId: 'environment:production',
          labelId: 'token',
        },
      }),
    ).toBe(true);
  });

  it('rejects invalid kind, page and page size values', () => {
    for (const payload of [
      { kind: 'other', query: '', page: 0, pageSize: 20 },
      { kind: 'vault', query: '', page: -1, pageSize: 20 },
      { kind: 'vault', query: '', page: 0.5, pageSize: 20 },
      { kind: 'vault', query: '', page: 0, pageSize: 51 },
      { kind: 'vault', query: '', page: 0, pageSize: 20, contextId: '' },
      { kind: 'vault', query: '', page: 0, pageSize: 20, labelId: 7 },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/search-panel',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('workspace lifecycle message contract', () => {
  it('accepts optimistic promotion and extension requests', () => {
    for (const type of [
      'snippet-vault/promote-workspace-item',
      'snippet-vault/extend-workspace-item',
    ]) {
      expect(
        isExtensionRequest({
          type,
          payload: {
            id: 'workspace-1',
            expectedUpdatedAt: 100,
          },
        }),
      ).toBe(true);
    }
  });

  it('rejects malformed workspace lifecycle requests', () => {
    for (const payload of [
      { id: '', expectedUpdatedAt: 100 },
      { id: 'workspace-1', expectedUpdatedAt: -1 },
      { id: 'workspace-1', expectedUpdatedAt: 1.5 },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/extend-workspace-item',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('update-snippet message contract', () => {
  it('accepts vault and workspace updates with explicit context actions', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/update-snippet',
        payload: {
          kind: 'vault',
          id: 'vault-1',
          expectedUpdatedAt: 100,
          content: 'updated token',
          labelIds: ['token'],
          context: { mode: 'preserve' },
        },
      }),
    ).toBe(true);

    expect(
      isExtensionRequest({
        type: 'snippet-vault/update-snippet',
        payload: {
          kind: 'workspace',
          id: 'workspace-1',
          expectedUpdatedAt: 100,
          content: 'updated note',
          labelIds: [],
          context: { mode: 'set', contextId: 'environment:test' },
          expiresAt: 2_000,
        },
      }),
    ).toBe(true);
  });

  it('rejects invalid optimistic concurrency, context, and expiry payloads', () => {
    for (const payload of [
      {
        kind: 'vault',
        id: '',
        expectedUpdatedAt: 100,
        content: 'updated token',
        labelIds: ['token'],
      },
      {
        kind: 'vault',
        id: 'vault-1',
        expectedUpdatedAt: -1,
        content: 'updated token',
        labelIds: ['token'],
      },
      {
        kind: 'vault',
        id: 'vault-1',
        expectedUpdatedAt: 100,
        content: 'updated token',
        labelIds: ['token'],
        context: { mode: 'set' },
      },
      {
        kind: 'vault',
        id: 'vault-1',
        expectedUpdatedAt: 100,
        content: 'updated token',
        labelIds: ['token'],
        context: { mode: 'clear', contextId: 'environment:test' },
      },
      {
        kind: 'vault',
        id: 'vault-1',
        expectedUpdatedAt: 100,
        content: 'updated token',
        labelIds: ['token'],
        expiresAt: 2_000,
      },
      {
        kind: 'workspace',
        id: 'workspace-1',
        expectedUpdatedAt: 100,
        content: 'updated note',
        labelIds: ['token', 'token'],
      },
      {
        kind: 'workspace',
        id: 'workspace-1',
        expectedUpdatedAt: 100,
        content: 'updated note',
        labelIds: [],
        expiresAt: 0,
      },
    ]) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/update-snippet',
          payload,
        }),
      ).toBe(false);
    }
  });
});

describe('request locale', () => {
  it('accepts the two supported locales and rejects other values', () => {
    for (const locale of ['en', 'zh_CN']) {
      expect(
        isExtensionRequest({
          type: 'snippet-vault/get-labels',
          locale,
        }),
      ).toBe(true);
    }

    for (const locale of ['zh-TW', 'fr', null]) {
      const message = {
        type: 'snippet-vault/get-labels',
        locale,
      };
      expect(isExtensionRequest(message)).toBe(false);
      expect(hasExtensionMessageType(message)).toBe(true);
    }
  });
});
