/* SPDX-License-Identifier: MPL-2.0 */

export const mediaTheme = {
  colors: {
    background: "oklch(1 0 0)",
    canvas: "oklch(0.966 0.005 106.5)",
    surface: "oklch(1 0 0)",
    ink: "oklch(0.153 0.006 107.1)",
    charcoal: "#2D2F34",
    charcoalSoft: "#3B3E44",
    muted: "oklch(0.565 0.031 107.3)",
    mutedOnDark: "#C8CAC5",
    accent: "#B3D62E",
    accentSoft: "#EEF5CE",
    onAccent: "#202216",
    white: "#FFFFFF",
  },
  fontFamily:
    'Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  radius: {
    frame: 14,
  },
  shadow: "0 6px 8px rgba(20, 22, 24, 0.18)",
} as const;
