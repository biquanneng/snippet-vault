// SPDX-License-Identifier: MPL-2.0

import { Clock3, Database, FileJson, PanelRight, Search, Tags } from "lucide-react";

const implementedFeatures = [
  {
    title: "Capture what you selected",
    body: "Save the selected text as Markdown with its page title, URL, and domain.",
    icon: Database,
  },
  {
    title: "Find it without leaving the page",
    body: "Double-press Shift for in-page search or keep the same view open in Chrome's side panel.",
    icon: Search,
  },
  {
    title: "Filter by context and label",
    body: "Use optional labels and color-coded contexts, then click either one to narrow the result list.",
    icon: Tags,
  },
  {
    title: "Let temporary work expire",
    body: "Extend a temporary item by your default expiry period or promote it permanently to the Vault.",
    icon: Clock3,
  },
] as const;

export function ProductPreview() {
  return (
    <section
      aria-label="Implemented SnippetVault features"
      className="overflow-hidden rounded-xl border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between border-b bg-secondary px-5 py-3">
        <div>
          <p className="text-sm font-semibold">Current Chrome build</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vault, temporary workspace, and settings
          </p>
        </div>
        <PanelRight className="size-5 text-brand" aria-hidden="true" />
      </div>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        {implementedFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="bg-background p-6 sm:p-7">
              <Icon className="size-5 text-brand" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {feature.body}
              </p>
            </article>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t bg-secondary/50 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <Database className="size-3.5" aria-hidden="true" />
          Readable local storage, no account or cloud sync
        </span>
        <span className="inline-flex items-center gap-2">
          <FileJson className="size-3.5" aria-hidden="true" />
          Export and restore .sv JSON backups
        </span>
      </div>
    </section>
  );
}
