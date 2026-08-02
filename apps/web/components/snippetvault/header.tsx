// SPDX-License-Identifier: MPL-2.0

import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SNIPPETVAULT_GITHUB_URL } from "@/lib/snippetvault/seo";
import { SnippetVaultContainer } from "./container";

const navigation = [
  { label: "Why", href: "/#why" },
  { label: "Planned flow", href: "/#concept" },
  { label: "Use cases", href: "/#use-cases" },
  { label: "Guides", href: "/guides" },
  { label: "FAQ", href: "/#faq" },
] as const;

export function SnippetVaultHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <SnippetVaultContainer className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <Link
            href="/"
            className="shrink-0 transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md"
            aria-label="SnippetVault home"
          >
            <Image
              src="/snippetvault/logo.png"
              alt="SnippetVault"
              width={1058}
              height={284}
              className="h-auto w-36"
              priority
            />
          </Link>
          <span className="hidden text-border sm:inline" aria-hidden="true">
            /
          </span>
          <a
            href="https://biqn.dev"
            className="hidden whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded sm:inline"
          >
            by BIQN
          </a>
        </div>

        <nav className="hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SNIPPETVAULT_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded"
            aria-label="SnippetVault on GitHub"
          >
            <Github className="size-4" aria-hidden="true" />
            <span className="hidden xl:inline">GitHub</span>
          </a>
        </nav>

        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-lime-800 dark:text-brand">
          <span
            className="size-1.5 rounded-full bg-brand"
            aria-hidden="true"
          />
          Pre-release
        </span>
      </SnippetVaultContainer>
    </header>
  );
}
