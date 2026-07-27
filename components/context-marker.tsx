// SPDX-License-Identifier: MPL-2.0

import { useId } from 'react';

import {
  CONTEXT_COLORS,
  type ContextColor,
} from '../lib/core/model';
import { cn } from '../lib/utils';

const CONTEXT_COLOR_CLASS_NAMES = {
  slate: 'bg-context-slate',
  blue: 'bg-context-blue',
  cyan: 'bg-context-cyan',
  green: 'bg-context-green',
  amber: 'bg-context-amber',
  orange: 'bg-context-orange',
  red: 'bg-context-red',
  purple: 'bg-context-purple',
} as const satisfies Record<ContextColor, string>;

const CONTEXT_MARKER_SIZE_CLASS_NAMES = {
  sm: 'size-2',
  md: 'size-2.5',
  lg: 'size-4',
} as const;

interface ContextMarkerProps {
  color: ContextColor;
  size?: keyof typeof CONTEXT_MARKER_SIZE_CLASS_NAMES;
  className?: string;
}

export function ContextMarker({
  color,
  size = 'sm',
  className,
}: ContextMarkerProps) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        CONTEXT_MARKER_SIZE_CLASS_NAMES[size],
        CONTEXT_COLOR_CLASS_NAMES[color],
        className,
      )}
      aria-hidden="true"
    />
  );
}

interface ContextColorPickerProps {
  value: ContextColor;
  label: string;
  disabled?: boolean;
  getColorLabel: (color: ContextColor) => string;
  onValueChange: (color: ContextColor) => void;
}

export function ContextColorPicker({
  value,
  label,
  disabled = false,
  getColorLabel,
  onValueChange,
}: ContextColorPickerProps) {
  const groupName = useId();

  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {CONTEXT_COLORS.map((color) => {
          const colorLabel = getColorLabel(color);
          return (
            <label
              key={color}
              className="relative inline-flex"
              title={colorLabel}
            >
              <input
                type="radio"
                name={groupName}
                value={color}
                checked={value === color}
                disabled={disabled}
                className="peer sr-only"
                aria-label={colorLabel}
                onChange={() => onValueChange(color)}
              />
              <span className="flex size-8 items-center justify-center rounded-md border bg-background transition-colors peer-checked:border-foreground/40 peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                <ContextMarker color={color} size="lg" />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
