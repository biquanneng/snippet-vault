// SPDX-License-Identifier: MPL-2.0

import type { MetadataRoute } from "next";
import { getSnippetVaultGuides } from "@/lib/snippetvault/guides";
import { SNIPPETVAULT_URL } from "@/lib/snippetvault/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const guides = await getSnippetVaultGuides();

  return [
    {
      url: SNIPPETVAULT_URL,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SNIPPETVAULT_URL}/guides`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...guides.map((guide) => ({
      url: `${SNIPPETVAULT_URL}/guides/${guide.slug}`,
      lastModified: guide.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ];
}
