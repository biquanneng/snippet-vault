// SPDX-License-Identifier: MPL-2.0

export const SELECTION_TOOLTIP_SUPPRESSION_VERSION = 1 as const;

export type SelectionTooltipSuppressionScope = 'page' | 'site';

export interface SelectionTooltipSuppressionRule {
  scope: SelectionTooltipSuppressionScope;
  value: string;
}

export interface SelectionTooltipSuppressionPreferences {
  version: typeof SELECTION_TOOLTIP_SUPPRESSION_VERSION;
  rules: readonly SelectionTooltipSuppressionRule[];
}

export function createEmptySelectionTooltipSuppressionPreferences(): SelectionTooltipSuppressionPreferences {
  return {
    version: SELECTION_TOOLTIP_SUPPRESSION_VERSION,
    rules: [],
  };
}

export function normalizeSelectionTooltipSuppressionPreferences(
  value: unknown,
): SelectionTooltipSuppressionPreferences {
  if (
    !isRecord(value) ||
    value.version !== SELECTION_TOOLTIP_SUPPRESSION_VERSION ||
    !Array.isArray(value.rules)
  ) {
    return createEmptySelectionTooltipSuppressionPreferences();
  }

  const rules: SelectionTooltipSuppressionRule[] = [];
  const seenRuleKeys = new Set<string>();
  for (const valueRule of value.rules) {
    const rule = normalizeSelectionTooltipSuppressionRule(valueRule);
    if (!rule) {
      continue;
    }

    const ruleKey = getSelectionTooltipSuppressionRuleKey(rule);
    if (!seenRuleKeys.has(ruleKey)) {
      rules.push(rule);
      seenRuleKeys.add(ruleKey);
    }
  }

  return {
    version: SELECTION_TOOLTIP_SUPPRESSION_VERSION,
    rules,
  };
}

export function normalizeSelectionTooltipSuppressionRule(
  value: unknown,
): SelectionTooltipSuppressionRule | null {
  if (
    !isRecord(value) ||
    (value.scope !== 'page' && value.scope !== 'site') ||
    typeof value.value !== 'string'
  ) {
    return null;
  }

  if (value.scope === 'page') {
    if (value.value.startsWith('null/')) {
      return value.value.includes('?') || value.value.includes('#')
        ? null
        : { scope: value.scope, value: value.value };
    }

    const normalizedRule = createSelectionTooltipSuppressionRule(
      value.scope,
      value.value,
    );
    return normalizedRule?.value === value.value ? normalizedRule : null;
  }

  const normalizedSiteValue = normalizeStoredHostname(value.value);
  return normalizedSiteValue
    ? { scope: value.scope, value: normalizedSiteValue }
    : null;
}

export function createSelectionTooltipSuppressionRule(
  scope: SelectionTooltipSuppressionScope,
  urlValue: string | URL,
): SelectionTooltipSuppressionRule | null {
  const url = parseUrl(urlValue);
  if (!url) {
    return null;
  }

  if (scope === 'site') {
    return url.hostname
      ? { scope, value: url.hostname.toLowerCase() }
      : null;
  }

  return {
    scope,
    value: `${url.origin}${url.pathname}`,
  };
}

export function isSelectionTooltipSuppressed(
  preferences: SelectionTooltipSuppressionPreferences,
  urlValue: string | URL,
): boolean {
  const pageRule = createSelectionTooltipSuppressionRule('page', urlValue);
  const siteRule = createSelectionTooltipSuppressionRule('site', urlValue);

  return preferences.rules.some(
    (rule) =>
      (pageRule && areSelectionTooltipSuppressionRulesEqual(rule, pageRule)) ||
      (siteRule && areSelectionTooltipSuppressionRulesEqual(rule, siteRule)),
  );
}

export function addSelectionTooltipSuppressionRule(
  preferences: SelectionTooltipSuppressionPreferences,
  rule: SelectionTooltipSuppressionRule,
): SelectionTooltipSuppressionPreferences {
  const normalizedPreferences =
    normalizeSelectionTooltipSuppressionPreferences(preferences);
  if (
    normalizedPreferences.rules.some((existingRule) =>
      areSelectionTooltipSuppressionRulesEqual(existingRule, rule),
    )
  ) {
    return normalizedPreferences;
  }

  return {
    version: SELECTION_TOOLTIP_SUPPRESSION_VERSION,
    rules: [...normalizedPreferences.rules, rule],
  };
}

export function removeSelectionTooltipSuppressionRule(
  preferences: SelectionTooltipSuppressionPreferences,
  rule: SelectionTooltipSuppressionRule,
): SelectionTooltipSuppressionPreferences {
  const normalizedPreferences =
    normalizeSelectionTooltipSuppressionPreferences(preferences);
  return {
    version: SELECTION_TOOLTIP_SUPPRESSION_VERSION,
    rules: normalizedPreferences.rules.filter(
      (existingRule) =>
        !areSelectionTooltipSuppressionRulesEqual(existingRule, rule),
    ),
  };
}

export function clearSelectionTooltipSuppressionRules(
  _preferences: SelectionTooltipSuppressionPreferences,
): SelectionTooltipSuppressionPreferences {
  return createEmptySelectionTooltipSuppressionPreferences();
}

export function getSelectionTooltipSuppressionRuleKey(
  rule: SelectionTooltipSuppressionRule,
): string {
  return `${rule.scope}:${rule.value}`;
}

function areSelectionTooltipSuppressionRulesEqual(
  left: SelectionTooltipSuppressionRule,
  right: SelectionTooltipSuppressionRule,
): boolean {
  return left.scope === right.scope && left.value === right.value;
}

function normalizeStoredHostname(value: string): string | null {
  if (!value || value !== value.trim() || value !== value.toLowerCase()) {
    return null;
  }

  try {
    const url = new URL(`https://${value}/`);
    return url.hostname === value && url.host === value
      ? value
      : null;
  } catch {
    return null;
  }
}

function parseUrl(value: string | URL): URL | null {
  if (value instanceof URL) {
    return value;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
