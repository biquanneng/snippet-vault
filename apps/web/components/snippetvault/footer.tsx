// SPDX-License-Identifier: MPL-2.0

import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BIQN_X_URL, SNIPPETVAULT_GITHUB_URL } from "@/lib/snippetvault/seo";
import { SnippetVaultContainer } from "./container";

export function SnippetVaultFooter() {
  return (
    <footer className="border-t py-8">
      <SnippetVaultContainer className="flex flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Image
            src="/snippetvault/logo.png"
            alt="SnippetVault"
            width={1058}
            height={284}
            className="h-auto w-36"
          />
          <p className="mt-1">
            Open source by{" "}
            <a href="https://biqn.dev" className="underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded">
              BIQN
            </a>
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Link
            href="/guides"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
          >
            Guides
          </Link>
          <Link
            href={SNIPPETVAULT_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
          >
            <Github className="size-4" aria-hidden="true" />
            GitHub
          </Link>
          <Link
            href={BIQN_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
          >
            X
          </Link>
          <a
            href="https://biqn.dev/about"
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
          >
            About BIQN
          </a>
        </div>
      </SnippetVaultContainer>
    </footer>
  );
}
