// SPDX-License-Identifier: MPL-2.0

"use client";

import { useEffect } from "react";

interface MicrosoftClarityProps {
  projectId: string;
}

export function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    void import("@microsoft/clarity").then(({ default: Clarity }) => {
      Clarity.init(projectId);
    });
  }, [projectId]);

  return null;
}
