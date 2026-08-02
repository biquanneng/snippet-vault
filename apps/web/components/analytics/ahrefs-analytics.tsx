// SPDX-License-Identifier: MPL-2.0

import Script from "next/script";

export function AhrefsAnalytics() {
  return (
    <Script
      async
      src="https://analytics.ahrefs.com/analytics.js"
      data-key="6titSrzOdBXsI2iYEuqQ+A"
      strategy="afterInteractive"
    />
  );
}
