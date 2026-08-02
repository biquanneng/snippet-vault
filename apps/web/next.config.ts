// SPDX-License-Identifier: MPL-2.0

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/snippetvault",
  output: "standalone",
  images: {
    unoptimized: true,
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
