// SPDX-License-Identifier: MPL-2.0

import {
  Clipboard,
  Command,
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
    snippetVault: "Planned cross-project reference",
  },
  {
    label: "Finding it again",
    env: "Open the right repository and file",
    chats: "Search or scroll through conversations",
    snippetVault: "Planned side-panel search",
  },
  {
    label: "Context",
    env: "Implied by its file path",
    chats: "Mixed with the conversation",
    snippetVault: "Planned project and environment labels",
  },
  {
    label: "Reuse",
    env: "Find, select, and copy",
    chats: "Reopen, locate, and copy",
    snippetVault: "Planned quick lookup and reuse",
  },
] as const;

export const plannedFeatures = [
  {
    title: "Quick capture",
    body: "Save a development value or reusable fragment you expect to look up again.",
    icon: Clipboard,
  },
  {
    title: "Useful context",
    body: "Organize planned snippets by project, environment, or purpose.",
    icon: Tags,
  },
  {
    title: "Fast filtering",
    body: "Search the planned vault from a Chrome side panel while the current page stays open.",
    icon: Search,
  },
  {
    title: "Direct reuse",
    body: "Bring the selected value back into the task at hand with minimal context switching.",
    icon: Command,
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
  "Open source — MPL-2.0 licensed, community-driven",
  "Local-first is the planned default",
  "No account required for the first version",
  "Focused on individual developers, not teams",
] as const;

export const faqItems = [
  {
    question: "What is a developer snippet manager?",
    answer:
      "A developer snippet manager keeps frequently reused text, configuration values, commands, and code fragments organized and searchable — accessible right from your browser while you work.",
  },
  {
    question: "What is SnippetVault being designed for?",
    answer:
      "SnippetVault helps you organize API keys, test tokens, environment values, commands, and reusable code snippets, then find them fast from a Chrome or Edge side panel without leaving your current tab.",
  },
  {
    question: "When will SnippetVault be available?",
    answer:
      "SnippetVault is under active development as an open-source project. It will be distributed through the Chrome Web Store and Edge Add-ons marketplace once the first version is ready. Star the GitHub repo to follow along.",
  },
  {
    question: "Is SnippetVault safe for storing production secrets?",
    answer:
      "SnippetVault is focused on personal development and sandbox references. It is not designed for production credentials or enterprise secret management. Storage and encryption details will be documented transparently as the open-source project evolves.",
  },
  {
    question: "Will SnippetVault sync data to the cloud?",
    answer:
      "The planned first version is local-first. Cloud synchronization has not been committed to, but as an open-source project, the community can influence this direction.",
  },
  {
    question: "How does SnippetVault compare with massCode?",
    answer:
      "SnippetVault takes a different approach — browser side-panel first, designed for quick lookup while you work. As an open-source project, it welcomes community contributions to help shape its direction.",
  },
] as const;
