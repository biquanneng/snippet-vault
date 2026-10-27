// SPDX-License-Identifier: MPL-2.0

import { Fragment, useRef, type ReactNode } from 'react';

import { Kbd, KbdGroup } from '../../../components/ui/kbd';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '../../../components/ui/popover';
import { cn } from '../../../lib/utils';

export interface PanelAction {
  id: string;
  label: string;
  /** Keys shown on the right, e.g. ['⌘', 'E']. Display only. */
  keys?: readonly string[];
  destructive?: boolean;
  disabled?: boolean;
  /** Keep the menu open after selecting, e.g. to confirm a deletion. */
  keepOpen?: boolean;
  onSelect: () => void;
}

export interface PanelActionSection {
  id: string;
  title?: string;
  actions: readonly PanelAction[];
}

interface ActionMenuProps {
  open: boolean;
  label: string;
  sections: readonly PanelActionSection[];
  portalContainer?: HTMLElement;
  /** The footer control the menu opens above. */
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}

/**
 * The ⌘K action list. Actions run on Enter or click; arrow keys move between
 * them. Closing returns focus to the search field via `onOpenChange`.
 */
export function ActionMenu({
  open,
  label,
  sections,
  portalContainer,
  children,
  onOpenChange,
}: ActionMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const moveFocus = (direction: 1 | -1 | 'first' | 'last') => {
    const items = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)',
      ) ?? []),
    ];
    if (items.length === 0) {
      return;
    }
    // Inside the content script's shadow root, `document.activeElement` is
    // the shadow host; the focused button is only visible from its own root.
    const root = listRef.current?.getRootNode() as Document | ShadowRoot;
    const current = items.indexOf(root?.activeElement as HTMLButtonElement);
    const next =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? items.length - 1
          : (current + direction + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        portalContainer={portalContainer}
        side="top"
        align="end"
        sideOffset={8}
        className="w-64 gap-0 p-1"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          moveFocus('first');
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        // In the content script's shadow root, focus events reach the document
        // retargeted to the host, so Radix can mistake the menu's own initial
        // focus for focus leaving it. Tab, Esc, ⌘K and outside clicks close it.
        onFocusOutside={(event) => event.preventDefault()}
      >
        <div
          ref={listRef}
          role="menu"
          aria-label={label}
          className="flex flex-col gap-px"
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              event.preventDefault();
              onOpenChange(false);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              moveFocus(event.key === 'ArrowDown' ? 1 : -1);
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              moveFocus(event.key === 'Home' ? 'first' : 'last');
            } else if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              // A held ⌘K auto-repeats; only a fresh press closes the menu.
              if (!event.repeat) {
                onOpenChange(false);
              }
            }
          }}
        >
          {sections
            .filter((section) => section.actions.length > 0)
            .map((section, index) => (
              <Fragment key={section.id}>
                {index > 0 ? <div className="mx-2.5 my-1 h-px bg-border" /> : null}
                {section.title ? (
                  <div className="px-2.5 pt-1.5 pb-1 text-xs text-muted-foreground">
                    {section.title}
                  </div>
                ) : null}
                {section.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    onClick={() => {
                      if (!action.keepOpen) {
                        onOpenChange(false);
                      }
                      action.onSelect();
                    }}
                    className={cn(
                      'flex h-8 w-full shrink-0 items-center gap-3 rounded-md px-2.5 text-left text-sm outline-none focus:bg-accent disabled:opacity-50',
                      action.destructive && 'text-destructive',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{action.label}</span>
                    {action.keys ? (
                      <KbdGroup>
                        {action.keys.map((key) => (
                          <Kbd key={key}>{key}</Kbd>
                        ))}
                      </KbdGroup>
                    ) : null}
                  </button>
                ))}
              </Fragment>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
