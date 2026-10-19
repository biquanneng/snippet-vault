// SPDX-License-Identifier: MPL-2.0

import { lazy, Suspense } from "react";
import type { AgentationProps } from "agentation";

// Agentation (https://agentation.com) is a dev-only UI annotation toolbar.
// `import.meta.env.DEV` is statically false in production builds, so the
// dynamic import is dropped and the PolyForm-licensed package never ships.
const Agentation = import.meta.env.DEV
  ? lazy(() =>
      import("agentation").then((module) => ({ default: module.Agentation })),
    )
  : null;

export function DevAgentation(props: AgentationProps) {
  if (!Agentation) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <Agentation appName="SnippetVault" {...props} />
    </Suspense>
  );
}
