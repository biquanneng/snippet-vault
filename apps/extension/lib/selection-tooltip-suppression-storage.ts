// SPDX-License-Identifier: MPL-2.0

import { storage } from 'wxt/utils/storage';

import {
  addSelectionTooltipSuppressionRule,
  clearSelectionTooltipSuppressionRules,
  createEmptySelectionTooltipSuppressionPreferences,
  createSelectionTooltipSuppressionRule,
  normalizeSelectionTooltipSuppressionPreferences,
  normalizeSelectionTooltipSuppressionRule,
  removeSelectionTooltipSuppressionRule,
  type SelectionTooltipSuppressionPreferences,
  type SelectionTooltipSuppressionRule,
  type SelectionTooltipSuppressionScope,
} from './selection-tooltip-suppression';

const selectionTooltipSuppressionStorage = storage.defineItem<unknown>(
  'local:selection-tooltip-suppression',
  { fallback: createEmptySelectionTooltipSuppressionPreferences() },
);

let preferenceMutationQueue = Promise.resolve();

/** Private channel that keeps preference mutations in one background context. */
export const SELECTION_TOOLTIP_SUPPRESSION_MUTATION_TYPE =
  'snippet-vault/internal/selection-tooltip-suppression-mutation';

type SelectionTooltipSuppressionMutation =
  | {
      action: 'add' | 'remove';
      rule: SelectionTooltipSuppressionRule;
    }
  | { action: 'clear' };

export interface SelectionTooltipSuppressionMutationRequest {
  type: typeof SELECTION_TOOLTIP_SUPPRESSION_MUTATION_TYPE;
  mutation: SelectionTooltipSuppressionMutation;
}

type SelectionTooltipSuppressionMutationResponse =
  | {
      ok: true;
      preferences: SelectionTooltipSuppressionPreferences;
    }
  | { ok: false };

export async function getSelectionTooltipSuppressionPreferences(): Promise<SelectionTooltipSuppressionPreferences> {
  return normalizeSelectionTooltipSuppressionPreferences(
    await selectionTooltipSuppressionStorage.getValue(),
  );
}

export function watchSelectionTooltipSuppressionPreferences(
  callback: (preferences: SelectionTooltipSuppressionPreferences) => void,
): () => void {
  return selectionTooltipSuppressionStorage.watch((value) => {
    callback(normalizeSelectionTooltipSuppressionPreferences(value));
  });
}

export async function suppressSelectionTooltipForUrl(
  scope: SelectionTooltipSuppressionScope,
  urlValue: string | URL,
): Promise<{
  preferences: SelectionTooltipSuppressionPreferences;
  rule: SelectionTooltipSuppressionRule;
}> {
  const rule = createSelectionTooltipSuppressionRule(scope, urlValue);
  if (!rule) {
    throw new Error('The current URL does not support this suppression scope.');
  }

  const preferences = await sendSelectionTooltipSuppressionMutation({
    action: 'add',
    rule,
  });
  return { preferences, rule };
}

export function deleteSelectionTooltipSuppressionRule(
  rule: SelectionTooltipSuppressionRule,
): Promise<SelectionTooltipSuppressionPreferences> {
  return sendSelectionTooltipSuppressionMutation({
    action: 'remove',
    rule,
  });
}

export function deleteAllSelectionTooltipSuppressionRules(): Promise<SelectionTooltipSuppressionPreferences> {
  return sendSelectionTooltipSuppressionMutation({ action: 'clear' });
}

export function isSelectionTooltipSuppressionMutationRequest(
  value: unknown,
): value is SelectionTooltipSuppressionMutationRequest {
  if (
    !isRecord(value) ||
    value.type !== SELECTION_TOOLTIP_SUPPRESSION_MUTATION_TYPE ||
    !isRecord(value.mutation) ||
    typeof value.mutation.action !== 'string'
  ) {
    return false;
  }

  if (value.mutation.action === 'clear') {
    return true;
  }
  if (
    value.mutation.action !== 'add' &&
    value.mutation.action !== 'remove'
  ) {
    return false;
  }

  return normalizeSelectionTooltipSuppressionRule(
    value.mutation.rule,
  ) !== null;
}

export function applySelectionTooltipSuppressionMutation(
  request: SelectionTooltipSuppressionMutationRequest,
): Promise<SelectionTooltipSuppressionPreferences> {
  return updateSelectionTooltipSuppressionPreferences((currentPreferences) => {
    if (request.mutation.action === 'clear') {
      return clearSelectionTooltipSuppressionRules(currentPreferences);
    }
    if (request.mutation.action === 'add') {
      return addSelectionTooltipSuppressionRule(
        currentPreferences,
        request.mutation.rule,
      );
    }
    return removeSelectionTooltipSuppressionRule(
      currentPreferences,
      request.mutation.rule,
    );
  });
}

function updateSelectionTooltipSuppressionPreferences(
  update: (
    preferences: SelectionTooltipSuppressionPreferences,
  ) => SelectionTooltipSuppressionPreferences,
): Promise<SelectionTooltipSuppressionPreferences> {
  const mutation = preferenceMutationQueue.then(async () => {
    const currentPreferences =
      await getSelectionTooltipSuppressionPreferences();
    const nextPreferences = update(currentPreferences);
    await selectionTooltipSuppressionStorage.setValue(nextPreferences);
    return nextPreferences;
  });
  preferenceMutationQueue = mutation.then(
    () => undefined,
    () => undefined,
  );
  return mutation;
}

async function sendSelectionTooltipSuppressionMutation(
  mutation: SelectionTooltipSuppressionMutation,
): Promise<SelectionTooltipSuppressionPreferences> {
  const response: unknown = await browser.runtime.sendMessage({
    type: SELECTION_TOOLTIP_SUPPRESSION_MUTATION_TYPE,
    mutation,
  } satisfies SelectionTooltipSuppressionMutationRequest);
  if (
    !isRecord(response) ||
    response.ok !== true ||
    !('preferences' in response)
  ) {
    throw new Error('The selection tooltip preference update failed.');
  }

  return normalizeSelectionTooltipSuppressionPreferences(
    response.preferences,
  );
}

export function createSelectionTooltipSuppressionMutationResponse(
  preferences?: SelectionTooltipSuppressionPreferences,
): SelectionTooltipSuppressionMutationResponse {
  return preferences
    ? { ok: true, preferences }
    : { ok: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
