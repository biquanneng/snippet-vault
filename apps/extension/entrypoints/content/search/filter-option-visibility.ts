// SPDX-License-Identifier: MPL-2.0

export function getVisibleFilterOptions<T extends { id: string }>(
  options: readonly T[],
  selectedId: string | undefined,
  maximum: number,
): T[] {
  const visible = options.slice(0, maximum);
  if (!selectedId || visible.some((option) => option.id === selectedId)) {
    return visible;
  }

  const selected = options.find((option) => option.id === selectedId);
  if (!selected || maximum < 1) {
    return visible;
  }

  return [...visible.slice(0, maximum - 1), selected];
}
