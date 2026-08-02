// SPDX-License-Identifier: MPL-2.0

import {
  CONTEXT_COLORS,
  type ContextColor,
  type ContextEnvironment,
} from './core/model';
import { getEnvironmentValue } from './localized-values';

export const DEFAULT_CONTEXT_COLOR: ContextColor = 'slate';

export const ENVIRONMENT_CONTEXT_COLORS = {
  development: 'blue',
  test: 'cyan',
  staging: 'amber',
  production: 'red',
} as const satisfies Record<ContextEnvironment, ContextColor>;

interface ContextColorSource {
  color?: unknown;
  environment?: unknown;
}

export function isContextColor(value: unknown): value is ContextColor {
  return (
    typeof value === 'string' &&
    CONTEXT_COLORS.includes(value as ContextColor)
  );
}

export function getContextPresetColor(
  preset: ContextColorSource,
): ContextColor {
  if (isContextColor(preset.color)) {
    return preset.color;
  }
  if (
    typeof preset.environment === 'string' &&
    Object.hasOwn(ENVIRONMENT_CONTEXT_COLORS, preset.environment)
  ) {
    return ENVIRONMENT_CONTEXT_COLORS[
      preset.environment as ContextEnvironment
    ];
  }
  return DEFAULT_CONTEXT_COLOR;
}

export function getStoredContextColor(
  color: unknown,
  context: string | undefined,
): ContextColor {
  if (isContextColor(color)) {
    return color;
  }
  const environment = getEnvironmentValue(context);
  return environment
    ? ENVIRONMENT_CONTEXT_COLORS[environment]
    : DEFAULT_CONTEXT_COLOR;
}
