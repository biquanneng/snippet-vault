// SPDX-License-Identifier: MPL-2.0

export interface SelectionTooltipShortcutKeyEvent {
  key: string;
  timeStamp: number;
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface SelectionTooltipSelectionIdentity {
  startContainer: unknown;
  startOffset: number;
  endContainer: unknown;
  endOffset: number;
  markdown: string;
}

export type SelectionTooltipShortcutPlatform = "macos" | "windows-linux";

export type SelectionTooltipShortcutState =
  | "ignored"
  | "pending"
  | "matched";

export class SelectionTooltipShortcutDetector {
  private pendingCopy: {
    timeStamp: number;
    selection: SelectionTooltipSelectionIdentity;
  } | null = null;

  constructor(
    private readonly platform: SelectionTooltipShortcutPlatform,
    private readonly thresholdMs = 400,
  ) {}

  register(
    event: SelectionTooltipShortcutKeyEvent,
    selection: SelectionTooltipSelectionIdentity,
  ): SelectionTooltipShortcutState {
    if (!isSelectionTooltipCopyShortcut(event, this.platform)) {
      this.reset();
      return "ignored";
    }

    if (this.pendingCopy !== null) {
      const elapsed = event.timeStamp - this.pendingCopy.timeStamp;
      if (
        elapsed >= 0 &&
        elapsed <= this.thresholdMs &&
        areSelectionTooltipSelectionsEqual(
          this.pendingCopy.selection,
          selection,
        )
      ) {
        this.reset();
        return "matched";
      }
    }

    this.pendingCopy = {
      timeStamp: event.timeStamp,
      selection,
    };
    return "pending";
  }

  reset(): void {
    this.pendingCopy = null;
  }
}

export function getSelectionTooltipShortcutPlatform(
  platformValue: string,
): SelectionTooltipShortcutPlatform {
  return platformValue.toLocaleLowerCase().includes("mac")
    ? "macos"
    : "windows-linux";
}

export function isSelectionTooltipCopyShortcut(
  event: SelectionTooltipShortcutKeyEvent,
  platform: SelectionTooltipShortcutPlatform,
): boolean {
  if (
    event.key.toLocaleLowerCase() !== "c" ||
    event.repeat ||
    event.altKey ||
    event.shiftKey
  ) {
    return false;
  }

  return platform === "macos"
    ? event.metaKey && !event.ctrlKey
    : event.ctrlKey && !event.metaKey;
}

function areSelectionTooltipSelectionsEqual(
  left: SelectionTooltipSelectionIdentity,
  right: SelectionTooltipSelectionIdentity,
): boolean {
  return (
    left.startContainer === right.startContainer &&
    left.startOffset === right.startOffset &&
    left.endContainer === right.endContainer &&
    left.endOffset === right.endOffset &&
    left.markdown === right.markdown
  );
}
