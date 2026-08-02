// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from 'vitest';

import type { SearchPanelItem } from '../../../lib/browser/message-contract';
import { groupVaultItemsByDomain } from './result-groups';

describe('groupVaultItemsByDomain', () => {
  it('orders groups by their highest-ranked item and preserves order within each group', () => {
    const items = [
      vaultItem('first', 'console.example.com'),
      vaultItem('second', 'docs.example.com'),
      vaultItem('third', 'console.example.com'),
      vaultItem('unknown'),
    ];

    expect(groupVaultItemsByDomain(items, 'Unknown source')).toEqual([
      {
        domain: 'console.example.com',
        items: [items[0], items[2]],
      },
      {
        domain: 'docs.example.com',
        items: [items[1]],
      },
      {
        domain: 'Unknown source',
        items: [items[3]],
      },
    ]);
  });

  it('ignores workspace records', () => {
    const workspace: SearchPanelItem = {
      kind: 'workspace',
      id: 'temporary',
      content: 'temporary',
      labels: [],
      createdAt: 100,
      updatedAt: 100,
      expiresAt: 1_000,
    };

    expect(groupVaultItemsByDomain([workspace], 'Unknown source')).toEqual([]);
  });
});

function vaultItem(
  id: string,
  domain?: string,
): Extract<SearchPanelItem, { kind: 'vault' }> {
  return {
    kind: 'vault',
    id,
    content: `${id}-secret`,
    labels: [],
    ...(domain ? { source: { domain } } : {}),
    pinned: false,
    createdAt: 100,
    updatedAt: 100,
  };
}
