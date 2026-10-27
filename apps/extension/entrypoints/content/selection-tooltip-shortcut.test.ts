// SPDX-License-Identifier: MPL-2.0

import { describe, expect, it } from "vitest";

import {
  getSelectionTooltipShortcutPlatform,
  SelectionTooltipShortcutDetector,
  type SelectionTooltipSelectionIdentity,
} from "./selection-tooltip-shortcut";

describe("SelectionTooltipShortcutDetector", () => {
  it("matches two Command+C presses on macOS", () => {
    const detector = new SelectionTooltipShortcutDetector("macos", 400);
    const selection = selectionIdentity();

    expect(detector.register(commandCEvent(100), selection)).toBe("pending");
    expect(detector.register(commandCEvent(450), selection)).toBe("matched");
  });

  it("matches two Ctrl+C presses on Windows and Linux", () => {
    const detector = new SelectionTooltipShortcutDetector(
      "windows-linux",
      400,
    );
    const selection = selectionIdentity();

    expect(detector.register(controlCEvent(100), selection)).toBe("pending");
    expect(detector.register(controlCEvent(450), selection)).toBe("matched");
  });

  it("requires the platform-specific copy modifier", () => {
    const macDetector = new SelectionTooltipShortcutDetector("macos", 400);
    const windowsDetector = new SelectionTooltipShortcutDetector(
      "windows-linux",
      400,
    );
    const selection = selectionIdentity();

    expect(macDetector.register(controlCEvent(100), selection)).toBe(
      "ignored",
    );
    expect(windowsDetector.register(commandCEvent(100), selection)).toBe(
      "ignored",
    );
  });

  it("starts a new sequence after the threshold or a selection change", () => {
    const detector = new SelectionTooltipShortcutDetector(
      "windows-linux",
      400,
    );
    const firstSelection = selectionIdentity();
    const secondSelection = selectionIdentity({ startOffset: 2 });

    expect(detector.register(controlCEvent(100), firstSelection)).toBe(
      "pending",
    );
    expect(detector.register(controlCEvent(600), firstSelection)).toBe(
      "pending",
    );
    expect(detector.register(controlCEvent(700), secondSelection)).toBe(
      "pending",
    );
    expect(detector.register(controlCEvent(900), secondSelection)).toBe(
      "matched",
    );
  });

  it("rejects repeat, modified, and unrelated key events", () => {
    const detector = new SelectionTooltipShortcutDetector(
      "windows-linux",
      400,
    );
    const selection = selectionIdentity();

    expect(
      detector.register(controlCEvent(100, { repeat: true }), selection),
    ).toBe("ignored");
    expect(
      detector.register(controlCEvent(150, { shiftKey: true }), selection),
    ).toBe("ignored");
    expect(
      detector.register(controlCEvent(200, { altKey: true }), selection),
    ).toBe("ignored");
    expect(detector.register(keyEvent("A", 250), selection)).toBe(
      "ignored",
    );

    expect(detector.register(controlCEvent(300), selection)).toBe("pending");
    expect(detector.register(keyEvent("A", 350), selection)).toBe(
      "ignored",
    );
    expect(detector.register(controlCEvent(400), selection)).toBe("pending");
  });

  it("detects the platform from the browser platform value", () => {
    expect(getSelectionTooltipShortcutPlatform("MacIntel")).toBe("macos");
    expect(getSelectionTooltipShortcutPlatform("Win32")).toBe(
      "windows-linux",
    );
    expect(getSelectionTooltipShortcutPlatform("Linux x86_64")).toBe(
      "windows-linux",
    );
  });
});

type SelectionTooltipShortcutEvent = Parameters<
  SelectionTooltipShortcutDetector["register"]
>[0];

function controlCEvent(
  timeStamp: number,
  overrides: Partial<SelectionTooltipShortcutEvent> = {},
): SelectionTooltipShortcutEvent {
  return {
    key: "c",
    timeStamp,
    repeat: false,
    altKey: false,
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

function commandCEvent(
  timeStamp: number,
  overrides: Partial<SelectionTooltipShortcutEvent> = {},
): SelectionTooltipShortcutEvent {
  return controlCEvent(timeStamp, {
    ctrlKey: false,
    metaKey: true,
    ...overrides,
  });
}

function keyEvent(
  key: string,
  timeStamp: number,
): SelectionTooltipShortcutEvent {
  return {
    ...controlCEvent(timeStamp),
    key,
  };
}

const selectionNode = {};

function selectionIdentity(
  overrides: Partial<SelectionTooltipSelectionIdentity> = {},
): SelectionTooltipSelectionIdentity {
  return {
    startContainer: selectionNode,
    startOffset: 0,
    endContainer: selectionNode,
    endOffset: 1,
    text: "selected text",
    ...overrides,
  };
}
