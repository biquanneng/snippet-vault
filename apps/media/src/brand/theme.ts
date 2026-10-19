/* SPDX-License-Identifier: MPL-2.0 */

export const mediaTheme = {
  colors: {
    background: "#FFFFFF",
    canvas: "#F8FAFC",
    surface: "#FFFFFF",
    ink: "#0F172A",
    charcoal: "#0F172A",
    charcoalSoft: "#1E293B",
    darkCanvas: "#0B0F17",
    darkSurface: "#111827",
    darkBorder: "rgba(255, 255, 255, 0.1)",
    muted: "#64748B",
    mutedOnDark: "#94A3B8",
    accent: "#84CC16",
    accentSoft: "#F7FEE7",
    accentBorder: "#D9F99D",
    onAccent: "#1A2E05",
    white: "#FFFFFF",
    border: "#E2E8F0",
    borderSubtle: "rgba(15, 23, 42, 0.06)",
  },
  fontFamily:
    'Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  radius: {
    frame: 14,
    card: 16,
  },
  shadow:
    "0 24px 48px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06), 0 8px 16px -6px rgba(15, 23, 42, 0.04)",
  darkShadow:
    "0 30px 60px -12px rgba(0, 0, 0, 0.56), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 24px -6px rgba(0, 0, 0, 0.35)",
} as const;
