// SPDX-License-Identifier: MPL-2.0

import {
  Clipboard,
  Command,
  Database,
  KeyRound,
  Layers3,
  PanelRight,
  Search,
  Tags,
} from "lucide-react";

export const comparisonRows = [
  {
    label: "Best at",
    env: "Runtime configuration inside one project",
    chats: "Capturing something in the moment",
    snippetVault: "Personal cross-project reference",
  },
  {
    label: "Finding it again",
    env: "Open the right repository and file",
    chats: "Search or scroll through conversations",
    snippetVault: "Double-Shift or persistent side-panel search",
  },
  {
    label: "Context",
    env: "Implied by its file path",
    chats: "Mixed with the conversation",
    snippetVault: "Optional labels plus project and environment context",
  },
  {
    label: "Reuse",
    env: "Find, select, and copy",
    chats: "Reopen, locate, and copy",
    snippetVault: "Copy, edit, delete, and filter in place",
  },
] as const;

export const currentFeatures = [
  {
    title: "Capture",
    body: "Save an explicit webpage selection as Markdown with source metadata, or create a source-free snippet directly.",
    icon: Clipboard,
  },
  {
    title: "Organize",
    body: "Add optional labels and a color-coded context, then use either one as a direct filter.",
    icon: Tags,
  },
  {
    title: "Retrieve",
    body: "Search content, labels, context, and source from double-Shift in-page search or Chrome's side panel.",
    icon: Search,
  },
  {
    title: "Reuse",
    body: "Copy a result immediately, or edit and delete it without leaving the result list.",
    icon: Command,
  },
  {
    title: "Expire or keep",
    body: "Let temporary items expire, extend them by the configured period, or promote them permanently to the Vault.",
    icon: Layers3,
  },
  {
    title: "Back up locally",
    body: "Export readable .sv JSON and preview a backup before it fully replaces local business data.",
    icon: Database,
  },
] as const;

export const useCases = [
  {
    title: "Across several projects",
    body: "Keep development keys, webhook references, commands, and small code fragments findable without remembering which repository held them.",
    icon: KeyRound,
  },
  {
    title: "Across environments",
    body: "Give development, staging, and sandbox variants enough context to avoid copying the wrong reference.",
    icon: Layers3,
  },
  {
    title: "Alongside browser work",
    body: "Reference a test token or command from the side panel while debugging, configuring a service, or reading documentation.",
    icon: PanelRight,
  },
] as const;

export const principles = [
  "Open source under MPL-2.0",
  "Readable local IndexedDB storage",
  "No account, hosted database, or cloud sync",
  "Optional analytics is off by default",
] as const;

export const faqItems = [
  {
    question: "What is a developer snippet manager?",
    answer:
      "A developer snippet manager keeps frequently reused text, configuration values, commands, and code fragments organized and searchable — accessible right from your browser while you work.",
  },
  {
    question: "What can SnippetVault do today?",
    answer:
      "SnippetVault can save selected webpage text or manually entered Markdown, organize it with optional labels and contexts, search it from double-Shift or Chrome's side panel, manage expiring temporary items, and import or export readable local backups.",
  },
  {
    question: "When will SnippetVault be available?",
    answer:
      "The Chrome MVP is implemented in the open-source repository and the Chrome Web Store listing is being prepared. Until the official listing is published, follow the repository for release status and source build instructions.",
  },
  {
    question: "Is SnippetVault safe for storing production secrets?",
    answer:
      "SnippetVault stores records and search data as readable plaintext in the browser profile, and exported backups are readable JSON. It is not a password manager or production secret manager. Use it only when you accept that local machine access, malware, or extension DevTools can read the data.",
  },
  {
    question: "Does SnippetVault sync data to the cloud?",
    answer:
      "No. Snippet records stay in the extension's local IndexedDB. SnippetVault has no account, hosted snippet database, or cloud sync. You can manually export and restore a readable .sv JSON backup.",
  },
  {
    question: "What data leaves my browser?",
    answer:
      "Saved snippets, labels, contexts, searches, source metadata, clipboard data, and backups do not leave your browser through SnippetVault. Optional analytics is off by default and, when enabled, sends only side-panel opens and successful double-Shift search opens to Google Analytics 4.",
  },
] as const;
