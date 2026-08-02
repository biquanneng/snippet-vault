// SPDX-License-Identifier: MPL-2.0

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SnippetVaultContainer } from "@/components/snippetvault/container";
import {
  formatSnippetVaultGuideDate,
  getSnippetVaultGuides,
  getSnippetVaultGuideUrl,
} from "@/lib/snippetvault/guides";
import { SNIPPETVAULT_SOCIAL_IMAGE, SNIPPETVAULT_URL } from "@/lib/snippetvault/seo";

export const metadata: Metadata = {
  title: "Developer Snippet Guides | SnippetVault",
  description:
    "Practical guides for organizing code snippets, securing API keys during development, and keeping reusable developer context easy to recover.",
  keywords: [
    "developer snippet guides",
    "api key security guide",
    "organize code snippets",
    "code snippet management tips",
  ],
  alternates: {
    canonical: `${SNIPPETVAULT_URL}/guides`,
  },
  openGraph: {
    title: "Developer Snippet Guides | SnippetVault",
    description:
      "Practical guides for organizing code snippets, securing API keys during development, and keeping reusable developer context easy to recover.",
    type: "website",
    url: `${SNIPPETVAULT_URL}/guides`,
    images: [
      {
        url: SNIPPETVAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: "Developer Snippet Guides | SnippetVault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Developer Snippet Guides | SnippetVault",
    description:
      "Practical guides for organizing code snippets, securing API keys during development, and keeping reusable developer context easy to recover.",
    creator: "@biquanneng",
    images: [SNIPPETVAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function SnippetVaultGuidesPage() {
  const guides = await getSnippetVaultGuides();

  return (
    <div className="pb-24 sm:pb-32">
      <section className="sv-reveal border-b py-16 sm:py-24">
        <SnippetVaultContainer>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            SnippetVault
          </Link>
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Developer snippet guides.
            </h1>
            <p className="mt-6 text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Practical notes on organizing reusable fragments, choosing the
              right storage boundary, and keeping development context easy to
              recover.
            </p>
          </div>
        </SnippetVaultContainer>
      </section>

      <SnippetVaultContainer>
        <div className="border-t">
          {guides.map((guide) => (
            <article
              key={guide.slug}
              className="sv-card-reveal group relative grid gap-6 border-b py-9 transition-colors sm:py-11 lg:grid-cols-12 lg:items-start"
            >
              <div className="flex items-center gap-3 text-sm text-muted-foreground lg:col-span-3">
                <span className="inline-flex items-center rounded-md bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                  {guide.category}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span>{guide.readingTime}</span>
              </div>
              <div className="lg:col-span-6">
                <h2 className="text-balance text-2xl font-semibold sm:text-3xl">
                  <Link
                    href={getSnippetVaultGuideUrl(guide.slug)}
                    className="transition-colors group-hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 after:absolute after:inset-0"
                  >
                    {guide.title}
                  </Link>
                </h2>
                <p className="mt-4 max-w-2xl text-pretty leading-7 text-muted-foreground">
                  {guide.description}
                </p>
              </div>
              <div className="flex items-end justify-between gap-5 lg:col-span-3 lg:flex-col lg:items-end">
                <time
                  dateTime={guide.publishedAt}
                  className="text-sm text-muted-foreground"
                >
                  {formatSnippetVaultGuideDate(guide.publishedAt)}
                </time>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-brand">
                  Read guide
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </SnippetVaultContainer>
    </div>
  );
}
