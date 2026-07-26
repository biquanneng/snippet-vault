// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import {
  MAX_LABEL_NAME_LENGTH,
  isExtensionRequest,
} from './message-contract';

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
    for (const name of [
      '   ',
      'x'.repeat(MAX_LABEL_NAME_LENGTH + 1),
    ]) {
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
  it('accepts Markdown content and rejects the legacy text field', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          content: '**deployment token**',
          temporary: false,
        },
      }),
    ).toBe(true);
    expect(
      isExtensionRequest({
        type: 'snippet-vault/save-selection',
        payload: {
          text: '**deployment token**',
          temporary: false,
        },
      }),
    ).toBe(false);
  });
});

describe('search-panel message contract', () => {
  it('accepts a bounded search request', () => {
    expect(
      isExtensionRequest({
        type: 'snippet-vault/search-panel',
        payload: {
          kind: 'workspace',
          query: 'deployment token',
          page: 0,
          pageSize: 20,
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
