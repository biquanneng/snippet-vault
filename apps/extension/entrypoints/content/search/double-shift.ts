// SPDX-License-Identifier: MPL-2.0

export interface ShortcutKeyEvent {
  key: string;
  timeStamp: number;
  repeat: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export class DoubleShiftDetector {
  private lastShiftAt: number | null = null;

  constructor(private readonly thresholdMs = 400) {}

  register(event: ShortcutKeyEvent): boolean {
    if (
      event.key !== 'Shift' ||
      event.repeat ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      this.reset();
      return false;
    }

    if (this.lastShiftAt !== null) {
      const elapsed = event.timeStamp - this.lastShiftAt;
      if (elapsed >= 0 && elapsed <= this.thresholdMs) {
        this.reset();
        return true;
      }
    }

    this.lastShiftAt = event.timeStamp;
    return false;
  }

  reset(): void {
    this.lastShiftAt = null;
  }
}
