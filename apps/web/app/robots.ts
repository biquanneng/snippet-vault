// SPDX-License-Identifier: MPL-2.0

import type { MetadataRoute } from "next";
import { SNIPPETVAULT_PATH, SNIPPETVAULT_URL } from "@/lib/snippetvault/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: `${SNIPPETVAULT_PATH}/`,
    },
    sitemap: `${SNIPPETVAULT_URL}/sitemap.xml`,
    host: "https://biqn.dev",
  };
}
