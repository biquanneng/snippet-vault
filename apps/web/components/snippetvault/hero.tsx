// SPDX-License-Identifier: MPL-2.0

import { ArrowDown, Github, Star } from "lucide-react";
import Link from "next/link";
import { SNIPPETVAULT_GITHUB_URL } from "@/lib/snippetvault/seo";
import { ConceptPreview } from "./concept-preview";
import { SnippetVaultContainer } from "./container";

const productFacts = [
  ["License", "MPL-2.0"],
  ["Platform", "Chrome & Edge"],
  ["Status", "Pre-release"],
] as const;

export function SnippetVaultHero() {
  return (
    <section className="overflow-hidden border-b py-16 sm:py-24">
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <div className="sv-hero-badge inline-flex items-center gap-2 rounded-md bg-brand/10 px-3 py-1.5 text-xs font-semibold text-lime-800 dark:text-brand">
            <Star className="size-3.5" aria-hidden="true" />
            Open source &middot; Chrome &amp; Edge
          </div>

          <h1 className="sv-hero-heading mt-7 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            A developer snippet manager for the fragments between projects.
          </h1>

          <p className="sv-hero-copy mt-6 text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Keep your API keys, test tokens, environment values, and reusable
            code searchable from a browser side panel — less digging, more
            building.
          </p>

          <div className="sv-hero-actions mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={SNIPPETVAULT_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sv-btn group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Github className="size-4" aria-hidden="true" />
              Star on GitHub
            </Link>
            <a
              href="#concept"
              className="sv-btn group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              See what&apos;s planned
              <ArrowDown
                className="size-4 transition-transform group-hover:translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </div>

          <div className="sv-hero-facts mt-8 inline-flex flex-wrap justify-center gap-3">
            {productFacts.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sv-hero-preview mt-14">
          <ConceptPreview />
        </div>
      </SnippetVaultContainer>
    </section>
  );
}
