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
        "Search content, labels, and sources locally, then copy without breaking your flow.",
    },
    capture: {
      headline: "Copy twice. Saved.",
      description:
        "Press Command/Ctrl+C twice. Credential labels are detected locally.",
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
      headline: "Local by default. Encrypted backups.",
      description:
        "No account or cloud. Export a passphrase-encrypted backup from Settings and restore it anytime.",
    },
  },
  "zh-CN": {
    search: {
      headline: "几秒内找到需要的片段。",
      description: "在本地搜索正文、标签和来源，并直接复制。",
    },
    capture: {
      headline: "复制两次，即已保存。",
      description: "按两次 Command/Ctrl+C 保存选区，并在本地自动识别凭据标签。",
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
      headline: "默认留在本地，备份加密。",
      description: "无需账号和云服务，从设置中导出口令加密的备份，随时恢复。",
    },
  },
};
