// SPDX-License-Identifier: MPL-2.0

import { SnippetVaultFaq } from "@/components/snippetvault/faq";
import { SnippetVaultGuidesSection } from "@/components/snippetvault/guides-section";
import { SnippetVaultHero } from "@/components/snippetvault/hero";
import {
  ClosingSection,
  ComparisonSection,
  CurrentFlowSection,
  TrustSection,
  UseCasesSection,
} from "@/components/snippetvault/landing-sections";
import { faqItems } from "@/lib/snippetvault/content";
import {
  SNIPPETVAULT_DESCRIPTION,
  SNIPPETVAULT_GITHUB_URL,
  SNIPPETVAULT_NAME,
  SNIPPETVAULT_URL,
} from "@/lib/snippetvault/seo";

export default function SnippetVaultPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SNIPPETVAULT_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Chrome",
    description: SNIPPETVAULT_DESCRIPTION,
    url: SNIPPETVAULT_URL,
    author: {
      "@type": "Person",
      name: "Bi Quanneng",
      url: "https://biqn.dev",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    license: "https://opensource.org/licenses/MPL-2.0",
    codeRepository: SNIPPETVAULT_GITHUB_URL,
    releaseNotes: `${SNIPPETVAULT_URL}/guides`,
  };

  return (
    <>
      <SnippetVaultHero />
      <ComparisonSection />
      <CurrentFlowSection />
      <UseCasesSection />
      <TrustSection />
      <SnippetVaultGuidesSection />
      <SnippetVaultFaq />
      <ClosingSection />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppSchema).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
