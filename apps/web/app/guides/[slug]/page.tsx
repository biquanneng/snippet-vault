// SPDX-License-Identifier: MPL-2.0

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SnippetVaultContainer } from "@/components/snippetvault/container";
import {
  formatSnippetVaultGuideDate,
  getSnippetVaultGuide,
  getSnippetVaultGuides,
} from "@/lib/snippetvault/guides";
import { SNIPPETVAULT_SOCIAL_IMAGE, SNIPPETVAULT_URL } from "@/lib/snippetvault/seo";

interface SnippetVaultGuidePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = await getSnippetVaultGuides();
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: SnippetVaultGuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getSnippetVaultGuide(slug);

  if (!guide) {
    return {};
  }

  const url = `${SNIPPETVAULT_URL}/guides/${guide.slug}`;

  return {
    title: `${guide.title} | SnippetVault`,
    description: guide.description,
    keywords: [guide.primaryKeyword],
    authors: [{ name: "Bi Quanneng", url: "https://biqn.dev" }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url,
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      authors: ["Bi Quanneng"],
      images: [
        {
          url: SNIPPETVAULT_SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
      creator: "@biquanneng",
      images: [SNIPPETVAULT_SOCIAL_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SnippetVaultGuidePage({
  params,
}: SnippetVaultGuidePageProps) {
  const { slug } = await params;
  const guide = await getSnippetVaultGuide(slug);

  if (!guide) {
    notFound();
  }

  const guideUrl = `${SNIPPETVAULT_URL}/guides/${guide.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    keywords: guide.primaryKeyword,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    mainEntityOfPage: guideUrl,
    author: {
      "@type": "Person",
      name: "Bi Quanneng",
      url: "https://biqn.dev",
    },
    publisher: {
      "@type": "Organization",
      name: "BIQN",
      url: "https://biqn.dev",
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "SnippetVault",
        item: SNIPPETVAULT_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${SNIPPETVAULT_URL}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: guide.title,
        item: guideUrl,
      },
    ],
  };

  return (
    <>
      <article className="pb-24 sm:pb-32">
        <header className="sv-reveal border-b py-14 sm:py-20">
          <SnippetVaultContainer>
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
            >
              <Link
                href="/"
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                SnippetVault
              </Link>
              <span aria-hidden="true">/</span>
              <Link
                href="/guides"
                className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Guides
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-foreground">{guide.title}</span>
            </nav>

            <div className="mx-auto mt-10 max-w-3xl text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center rounded-md bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                  {guide.category}
                </span>
                <span className="text-muted-foreground" aria-hidden="true">
                  &middot;
                </span>
                <span className="text-muted-foreground">
                  {guide.readingTime}
                </span>
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {guide.title}
              </h1>
              <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
                {guide.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span>By Bi Quanneng</span>
                <time dateTime={guide.publishedAt}>
                  Published {formatSnippetVaultGuideDate(guide.publishedAt)}
                </time>
              </div>
            </div>
          </SnippetVaultContainer>
        </header>

        <SnippetVaultContainer className="py-14 lg:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="prose prose-neutral max-w-none prose-headings:text-balance prose-headings:font-bold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-3xl prose-p:text-pretty prose-p:text-base prose-p:leading-8 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-li:marker:text-brand prose-ol:pl-5 prose-ul:pl-5 prose-strong:text-foreground prose-code:rounded prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:bg-muted/40 prose-pre:p-4 prose-table:w-full prose-table:overflow-hidden prose-table:rounded-lg prose-table:border prose-thead:bg-secondary prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-sm prose-th:font-semibold prose-td:px-4 prose-td:py-3 prose-td:text-sm prose-td:leading-6 prose-td:text-muted-foreground prose-blockquote:border-l-4 prose-blockquote:border-brand prose-blockquote:bg-brand/10 prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:not-italic prose-blockquote:text-foreground dark:prose-invert dark:prose-p:text-muted-foreground dark:prose-li:text-muted-foreground dark:prose-thead:bg-muted/30">
              <div
                dangerouslySetInnerHTML={{ __html: guide.contentHtml }}
              />
            </div>

            <div className="sv-card mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <h2 className="text-xl font-semibold">
                  Explore the SnippetVault direction
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  See the planned browser-side-panel workflow and current
                  pre-release scope.
                </p>
              </div>
              <Link
                href="/"
                className="sv-btn inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                Visit SnippetVault
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-8">
              <Link
                href="/guides"
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-md"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                All guides
              </Link>
            </div>
          </div>
        </SnippetVaultContainer>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
