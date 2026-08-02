// SPDX-License-Identifier: MPL-2.0

import { LegalDocument } from "@/components/snippetvault/legal-document";
import {
  SNIPPETVAULT_GITHUB_URL,
  SNIPPETVAULT_SOCIAL_IMAGE,
  SNIPPETVAULT_SUPPORT_EMAIL,
  SNIPPETVAULT_URL,
} from "@/lib/snippetvault/seo";
import type { Metadata } from "next";
import Link from "next/link";

const title = "Terms of Use | SnippetVault";
const description =
  "The terms that apply when using the official SnippetVault extension and website.";
const termsUrl = `${SNIPPETVAULT_URL}/terms`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: termsUrl },
  openGraph: {
    title,
    description,
    type: "website",
    url: termsUrl,
    images: [{ url: SNIPPETVAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SNIPPETVAULT_SOCIAL_IMAGE],
  },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      description="These short terms cover the official SnippetVault extension and website. The open-source license continues to govern the source code."
      updatedAt="August 2, 2026"
    >
      <p>
        By installing or using the official SnippetVault browser extension, or
        by using the SnippetVault website, you agree to these terms. If you do
        not agree, do not use the official extension or website.
      </p>

      <h2>What SnippetVault provides</h2>
      <p>
        SnippetVault is a local-first developer snippet manager. It lets you
        explicitly save selected or manually entered text, organize and search
        it locally, use a temporary workspace, and import or export local
        backups. The official product currently has no account, subscription,
        hosted snippet database, cloud sync, or team workspace.
      </p>

      <h2>Your responsibility</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>using SnippetVault lawfully and only with data you may handle;</li>
        <li>
          protecting your browser profile, device, clipboard, and exported .sv
          backup files;
        </li>
        <li>
          checking copied values before using them in commands, code,
          deployments, or production systems; and
        </li>
        <li>
          keeping an appropriate backup before importing data, because import
          replaces rather than merges the local business data.
        </li>
      </ul>
      <p>
        Do not use SnippetVault to collect data without authorization, violate
        another person&apos;s privacy, distribute malware, or support unlawful
        access to systems or accounts.
      </p>

      <h2>Sensitive data and local storage</h2>
      <p>
        You retain any rights you have in the content you store. SnippetVault
        does not claim ownership of your snippets or backups and cannot access
        records that remain in your local browser storage.
      </p>
      <p>
        SnippetVault stores records, search terms derived from those records,
        and exported backups in readable form. It does not encrypt them and
        cannot protect data from someone who controls your device, browser
        profile, local files, or extension DevTools. SnippetVault is not a
        password manager, encrypted vault, production secret manager, or secure
        deletion tool.
      </p>
      <p>
        Use a purpose-built, access-controlled secret manager for production
        credentials, team sharing, audit trails, automatic rotation, or other
        high-assurance requirements.
      </p>

      <h2>Availability and changes</h2>
      <p>
        SnippetVault is pre-release software. Features, formats, browser
        compatibility, and availability may change. We may fix, change,
        suspend, or discontinue the official extension or website. When a
        change affects data handling, the
        {" "}
        <Link href="/privacy">Privacy Policy</Link> will be updated.
      </p>

      <h2>Open-source license and brand</h2>
      <p>
        SnippetVault source code is available under the Mozilla Public License
        2.0. That license governs copying, modification, and distribution of
        MPL-covered source files and is not replaced by these terms. Third-party
        components remain subject to their own licenses.
      </p>
      <p>
        The SnippetVault name, logos, official store identity, and BIQN branding
        are not granted under the source-code license. Public forks and modified
        distributions must follow the repository&apos;s trademark policy and use a
        distinct identity unless permission is granted.
      </p>

      <h2>Third-party services and links</h2>
      <p>
        The website and optional extension analytics use third-party services
        described in the <Link href="/privacy">Privacy Policy</Link>. The
        website may also link to other sites. Their availability, content,
        security, and policies are controlled by their respective operators.
      </p>

      <h2>No warranty</h2>
      <p>
        To the maximum extent permitted by law, SnippetVault is provided “as
        is” and “as available,” without warranties of accuracy, reliability,
        availability, fitness for a particular purpose, non-infringement, or
        freedom from defects or data loss. You are responsible for deciding
        whether it is suitable for your use.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the SnippetVault maintainers
        and contributors will not be liable for indirect, incidental, special,
        consequential, or exemplary losses arising from use of the official
        extension, website, local data, copied values, or backups. Nothing in
        these terms excludes liability that cannot legally be excluded.
      </p>

      <h2>Contact</h2>
      <p>
        For general or legal questions, email
        {" "}
        <a href={`mailto:${SNIPPETVAULT_SUPPORT_EMAIL}`}>
          {SNIPPETVAULT_SUPPORT_EMAIL}
        </a>
        . You may also open a non-sensitive issue in the
        {" "}
        <a href={`${SNIPPETVAULT_GITHUB_URL}/issues`}>SnippetVault repository</a>.
        For security reports, use the repository&apos;s
        {" "}
        <a href={`${SNIPPETVAULT_GITHUB_URL}/security`}>private security channel</a>
        {" "}
        and do not publish sensitive details.
      </p>
    </LegalDocument>
  );
}
