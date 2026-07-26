// SPDX-License-Identifier: MPL-2.0

import type { SearchPanelItem } from '../../../lib/browser/message-contract';

export type VaultSearchItem = Extract<
  SearchPanelItem,
  { kind: 'vault' }
>;

export interface VaultDomainGroup {
  domain: string;
  items: VaultSearchItem[];
}

const UNKNOWN_DOMAIN = '未记录来源';

export function groupVaultItemsByDomain(
  items: SearchPanelItem[],
): VaultDomainGroup[] {
  const groups = new Map<string, VaultSearchItem[]>();

  for (const item of items) {
    if (item.kind !== 'vault') {
      continue;
    }

    const domain = item.source?.domain?.trim() || UNKNOWN_DOMAIN;
    const group = groups.get(domain);
    if (group) {
      group.push(item);
    } else {
      groups.set(domain, [item]);
    }
  }

  return [...groups].map(([domain, groupedItems]) => ({
    domain,
    items: groupedItems,
  }));
}
