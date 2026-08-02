// SPDX-License-Identifier: MPL-2.0

import { ImageIcon, PanelRight } from "lucide-react";

export function ConceptPreview() {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="overflow-hidden">
        <div className="flex h-10 items-center justify-between border-b bg-secondary px-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border/60" />
            <span className="size-2.5 rounded-full bg-border/30" />
          </div>
          <span className="text-xs text-muted-foreground">
            Chrome side panel
          </span>
          <PanelRight className="size-4 text-brand" aria-hidden="true" />
        </div>

        <div className="flex aspect-[4/3] flex-col items-center justify-center bg-secondary/30 px-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-xl border-2 border-dashed bg-background text-brand">
            <ImageIcon className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-base font-semibold">
            Product screenshot reserved
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            A real Chrome side-panel preview will replace this placeholder when
            the extension ships.
          </p>
          <div className="mt-6 rounded-md bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
            Coming soon
          </div>
        </div>
      </div>

      <figcaption className="flex items-center justify-between border-t bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">
        <span>No product UI is being presented as shipped.</span>
        <span className="shrink-0">Preview placeholder</span>
      </figcaption>
    </figure>
  );
}
