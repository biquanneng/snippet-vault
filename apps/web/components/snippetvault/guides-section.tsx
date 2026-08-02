// SPDX-License-Identifier: MPL-2.0

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import {
  getSnippetVaultGuides,
  getSnippetVaultGuideUrl,
} from "@/lib/snippetvault/guides";
import { SnippetVaultContainer } from "./container";

export async function SnippetVaultGuidesSection() {
  const [featuredGuide, ...supportingGuides] =
    await getSnippetVaultGuides();

  return (
    <section id="guides" className="sv-reveal scroll-mt-24 border-b py-20 sm:py-28">
      <SnippetVaultContainer>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Practical notes for the fragments between projects.
          </h2>
          <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">
            Guides for organizing developer snippets, deciding where
            configuration belongs, and keeping reusable context trustworthy.
          </p>
          <Link
            href="/guides"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Browse all guides
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Link
            href={getSnippetVaultGuideUrl(featuredGuide.slug)}
            className="sv-card-reveal group flex min-h-80 flex-col justify-between rounded-xl bg-primary p-7 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:p-10"
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-brand">
                {featuredGuide.category}
              </span>
              <span className="text-primary-foreground/60">
                {featuredGuide.readingTime}
              </span>
            </div>
            <div className="mt-16 max-w-2xl">
              <h3 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                {featuredGuide.title}
              </h3>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-primary-foreground/70">
                {featuredGuide.description}
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">
                Read the guide
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>

          <div className="flex flex-col gap-6">
            {supportingGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={getSnippetVaultGuideUrl(guide.slug)}
                className="sv-card-reveal sv-card group flex flex-1 flex-col justify-between rounded-xl border bg-card p-7 transition-colors hover:border-brand/30 hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:p-8"
              >
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-brand">
                    {guide.category}
                  </span>
                  <span className="text-muted-foreground">
                    {guide.readingTime}
                  </span>
                </div>
                <div className="mt-10 flex items-end justify-between gap-6">
                  <h3 className="max-w-md text-balance text-xl font-semibold sm:text-2xl">
                    {guide.title}
                  </h3>
                  <ArrowUpRight
                    className="mb-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SnippetVaultContainer>
    </section>
  );
}
