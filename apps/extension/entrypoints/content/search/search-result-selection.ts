// SPDX-License-Identifier: MPL-2.0

export function getNextSearchResultSelectionId(
  itemIds: readonly string[],
  currentId: string | undefined,
  direction: -1 | 1,
): string | undefined {
  if (itemIds.length === 0) {
    return undefined;
  }

  const currentIndex = currentId ? itemIds.indexOf(currentId) : -1;
  if (currentIndex === -1) {
    return direction === 1 ? itemIds[0] : itemIds.at(-1);
  }

  const nextIndex = Math.min(
    itemIds.length - 1,
    Math.max(0, currentIndex + direction),
  );
  return itemIds[nextIndex];
}

export function getSearchResultOptionId(
  resultsId: string,
  itemId: string,
): string {
  return `${resultsId}-${itemId}`;
}
