// SPDX-License-Identifier: MPL-2.0

import "server-only";

import { cache } from "react";
import {
  snippetVaultGuideHtml,
  snippetVaultGuideMetadata,
} from "@/lib/snippetvault/content-data";

export interface SnippetVaultGuideFrontmatter {
  title: string;
  description: string;
  category: "Security" | "Concept" | "Comparison" | "Workflow";
  primaryKeyword: string;
  searchIntent: "Commercial" | "Informational";
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  order: number;
}

export interface SnippetVaultGuideEntry
  extends SnippetVaultGuideFrontmatter {
  slug: string;
}

export interface SnippetVaultGuideDocument extends SnippetVaultGuideEntry {
  contentHtml: string;
}

function assertFrontmatter(
  slug: string,
  frontmatter: Partial<SnippetVaultGuideFrontmatter>,
): asserts frontmatter is SnippetVaultGuideFrontmatter {
  const requiredTextFields = [
    "title",
    "description",
    "category",
    "primaryKeyword",
    "searchIntent",
    "publishedAt",
    "updatedAt",
    "readingTime",
  ] as const;

  for (const field of requiredTextFields) {
    if (!frontmatter[field]) {
      throw new Error(
        `SnippetVault guide "${slug}" is missing frontmatter field "${field}".`,
      );
    }
  }

  if (
    typeof frontmatter.order !== "number" ||
    !Number.isFinite(frontmatter.order)
  ) {
    throw new Error(
      `SnippetVault guide "${slug}" must define a numeric frontmatter order.`,
    );
  }

  if (
    frontmatter.category !== "Security" &&
    frontmatter.category !== "Concept" &&
    frontmatter.category !== "Comparison" &&
    frontmatter.category !== "Workflow"
  ) {
    throw new Error(
      `SnippetVault guide "${slug}" has an unsupported category.`,
    );
  }

  if (
    frontmatter.searchIntent !== "Commercial" &&
    frontmatter.searchIntent !== "Informational"
  ) {
    throw new Error(
      `SnippetVault guide "${slug}" has an unsupported search intent.`,
    );
  }
}

export const getSnippetVaultGuide = cache(
  async (slug: string): Promise<SnippetVaultGuideDocument | undefined> => {
    const contentHtml =
      snippetVaultGuideHtml[slug as keyof typeof snippetVaultGuideHtml];
    const rawFrontmatter =
      snippetVaultGuideMetadata[
        slug as keyof typeof snippetVaultGuideMetadata
      ];

    if (!contentHtml || !rawFrontmatter) {
      return undefined;
    }

    const frontmatter: Partial<SnippetVaultGuideFrontmatter> = {
      ...rawFrontmatter,
    };
    assertFrontmatter(slug, frontmatter);

    return {
      slug,
      ...frontmatter,
      contentHtml,
    };
  },
);

export const getSnippetVaultGuides = cache(
  async (): Promise<SnippetVaultGuideEntry[]> => {
    const guides = Object.entries(snippetVaultGuideMetadata).map(
      ([slug, rawFrontmatter]) => {
        const frontmatter: Partial<SnippetVaultGuideFrontmatter> = {
          ...rawFrontmatter,
        };
        assertFrontmatter(slug, frontmatter);

        return {
          slug,
          ...frontmatter,
        };
      },
    );

    return guides.sort((left, right) => left.order - right.order);
  },
);

export function getSnippetVaultGuideUrl(slug: string) {
  return `/guides/${slug}`;
}

export function formatSnippetVaultGuideDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}
