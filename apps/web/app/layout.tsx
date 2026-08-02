// SPDX-License-Identifier: MPL-2.0

import { AhrefsAnalytics } from "@/components/analytics/ahrefs-analytics";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { MicrosoftClarity } from "@/components/analytics/microsoft-clarity";
import { SnippetVaultFooter } from "@/components/snippetvault/footer";
import { SnippetVaultHeader } from "@/components/snippetvault/header";
import {
  SNIPPETVAULT_DESCRIPTION,
  SNIPPETVAULT_KEYWORDS,
  SNIPPETVAULT_SOCIAL_IMAGE,
  SNIPPETVAULT_TITLE,
  SNIPPETVAULT_URL,
} from "@/lib/snippetvault/seo";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import "./tokens.css";
import "@/components/snippetvault/snippetvault.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(`${SNIPPETVAULT_URL}/`),
  title: SNIPPETVAULT_TITLE,
  description: SNIPPETVAULT_DESCRIPTION,
  keywords: SNIPPETVAULT_KEYWORDS,
  authors: [{ name: "Bi Quanneng", url: "https://biqn.dev" }],
  creator: "Bi Quanneng",
  publisher: "BIQN.dev",
  alternates: {
    canonical: SNIPPETVAULT_URL,
  },
  openGraph: {
    title: SNIPPETVAULT_TITLE,
    description: SNIPPETVAULT_DESCRIPTION,
    url: SNIPPETVAULT_URL,
    siteName: "BIQN",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: SNIPPETVAULT_SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: SNIPPETVAULT_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SNIPPETVAULT_TITLE,
    description: SNIPPETVAULT_DESCRIPTION,
    creator: "@biquanneng",
    images: [SNIPPETVAULT_SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function SnippetVaultLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();

  return (
    <html lang="en" className={geistSans.variable}>
      <body
        data-product="snippetvault"
        className="min-h-screen overflow-x-hidden antialiased [&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance"
      >
        <a
          href="#snippetvault-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground"
        >
          Skip to content
        </a>
        <SnippetVaultHeader />
        <main id="snippetvault-content" tabIndex={-1}>
          {children}
        </main>
        <SnippetVaultFooter />
        {clarityProjectId ? (
          <MicrosoftClarity projectId={clarityProjectId} />
        ) : null}
        <AhrefsAnalytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
