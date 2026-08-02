// SPDX-License-Identifier: MPL-2.0

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SnippetVaultContainer } from "./container";

interface LegalDocumentProps {
  children: ReactNode;
  description: string;
  title: string;
  updatedAt: string;
}

export function LegalDocument({
  children,
  description,
  title,
  updatedAt,
}: LegalDocumentProps) {
  return (
    <article className="pb-24 sm:pb-32">
      <header className="border-b py-14 sm:py-20">
        <SnippetVaultContainer>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            SnippetVault
          </Link>
          <div className="mx-auto mt-10 max-w-3xl">
            <p className="text-sm font-semibold text-brand">Legal</p>
            <h1 className="mt-3 text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-8 text-muted-foreground">
              {description}
            </p>
            <p className="mt-5 text-sm text-muted-foreground">
              Last updated: {updatedAt}
            </p>
          </div>
        </SnippetVaultContainer>
      </header>

      <SnippetVaultContainer className="py-12 sm:py-16">
        <div className="prose prose-neutral mx-auto max-w-3xl prose-headings:text-balance prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-p:text-pretty prose-p:leading-8 prose-p:text-muted-foreground prose-li:leading-7 prose-li:text-muted-foreground prose-li:marker:text-brand prose-a:font-medium prose-a:text-foreground prose-a:underline prose-a:decoration-border prose-a:underline-offset-4 hover:prose-a:decoration-foreground prose-strong:text-foreground dark:prose-invert dark:prose-p:text-muted-foreground dark:prose-li:text-muted-foreground">
          {children}
        </div>
      </SnippetVaultContainer>
    </article>
  );
}
