/* SPDX-License-Identifier: MPL-2.0 */

export type StoreLocale = "en" | "zh-CN";

export type StoreSlideId =
  | "search"
  | "capture"
  | "in-page-search"
  | "temporary-workspace"
  | "local-backup";

type StoreSlideCopy = {
  readonly headline: string;
  readonly description: string;
};

export const storeSlides: readonly StoreSlideId[] = [
  "search",
  "capture",
  "in-page-search",
  "temporary-workspace",
  "local-backup",
];

export const storeCopy: Record<
  StoreLocale,
  Record<StoreSlideId, StoreSlideCopy>
> = {
  en: {
    search: {
      headline: "Find any snippet in seconds.",
      description:
        "Search locally, filter by context or label, and copy without breaking your flow.",
    },
    capture: {
      headline: "Select. Save. Keep moving.",
      description:
        "Capture selected text; add a label or context only when it helps.",
    },
    "in-page-search": {
      headline: "Double-Shift to search anywhere.",
      description:
        "Open the in-page search panel without leaving the tab you are working in.",
    },
    "temporary-workspace": {
      headline: "Keep temporary work temporary.",
      description:
        "Let short-lived snippets expire, extend them, or promote them when they become useful.",
    },
    "local-backup": {
      headline: "Local by default. Back up when you choose.",
      description:
        "Export and restore a readable backup from Settings, with no account or cloud service.",
    },
  },
  "zh-CN": {
    search: {
      headline: "几秒内找到需要的片段。",
      description: "本地检索，按 Context 或 Label 筛选，并直接复制。",
    },
    capture: {
      headline: "选中、保存，继续当前工作。",
      description: "直接保存网页选区，只在有帮助时添加 Label 或 Context。",
    },
    "in-page-search": {
      headline: "双击 Shift，随处检索。",
      description: "不用离开当前页面，立即打开页面内检索面板。",
    },
    "temporary-workspace": {
      headline: "让临时内容按时消失。",
      description: "短期片段可以自动过期、延期，或者转为永久保存。",
    },
    "local-backup": {
      headline: "默认留在本地，按需备份。",
      description: "无需账号和云服务，直接从设置中导出或恢复可读备份。",
    },
  },
};
