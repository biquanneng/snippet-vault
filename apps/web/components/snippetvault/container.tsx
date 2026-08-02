// SPDX-License-Identifier: MPL-2.0

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function SnippetVaultContainer({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}
      {...props}
    />
  );
}
