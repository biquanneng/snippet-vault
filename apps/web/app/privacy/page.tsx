// SPDX-License-Identifier: MPL-2.0

import { LegalDocument } from "@/components/snippetvault/legal-document";
import {
  SNIPPETVAULT_GITHUB_URL,
  SNIPPETVAULT_SOCIAL_IMAGE,
  SNIPPETVAULT_SUPPORT_EMAIL,
  SNIPPETVAULT_URL,
} from "@/lib/snippetvault/seo";
import type { Metadata } from "next";

const title = "Privacy Policy | SnippetVault";
const description =
  "How the SnippetVault browser extension and website handle local snippets, optional usage analytics, backups, and website analytics.";
const privacyUrl = `${SNIPPETVAULT_URL}/privacy`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: privacyUrl },
  openGraph: {
    title,
    description,
    type: "website",
    url: privacyUrl,
    images: [{ url: SNIPPETVAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SNIPPETVAULT_SOCIAL_IMAGE],
  },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="SnippetVault is local-first. This policy explains what stays in your browser, what can leave it, and the controls available to you."
      updatedAt="August 2, 2026"
    >
      <p>
        This policy covers the official SnippetVault browser extension and the
        SnippetVault pages hosted on biqn.dev. The extension and website have
        different data flows, which are described separately below. SnippetVault
        is maintained by Bi Quanneng under the BIQN brand.
      </p>

      <h2>In short</h2>
      <ul>
        <li>
          Your snippets, labels, contexts, searches, source details, clipboard
          contents, and backups are not sent to SnippetVault or biqn.dev.
        </li>
        <li>
          Extension records and the search index are stored as readable data in
          the extension&apos;s local browser storage. They are not encrypted.
        </li>
        <li>
          Optional extension analytics is off by default and counts only two
          entry actions after you enable it.
        </li>
        <li>
          The public website uses separate traffic and experience analytics as
          described under Website analytics.
        </li>
      </ul>

      <h2>Data handled by the extension</h2>
      <p>
        SnippetVault handles only the information needed to save, organize,
        search, copy, edit, expire, and restore your records. Depending on how
        you use it, this may include:
      </p>
      <ul>
        <li>text or Markdown you explicitly select or enter;</li>
        <li>optional labels and a context selected by you;</li>
        <li>
          for saved webpage selections, the page title, full URL, and domain;
        </li>
        <li>
          record identifiers, creation and update times, pin and last-use state,
          and temporary-item expiry times; and
        </li>
        <li>
          local preferences such as language, theme, default expiry period, and
          your analytics choice.
        </li>
      </ul>
      <p>
        Snippet records, labels, contexts, metadata, and the derived search
        index stay in the extension origin&apos;s IndexedDB. Preferences stay in
        Chrome extension storage. SnippetVault has no account system and no
        hosted snippet database or cloud sync.
      </p>

      <h2>Page access and browser permissions</h2>
      <p>
        SnippetVault runs a content script on supported webpages so it can show
        the selection tooltip and respond to the double-Shift search gesture.
        It reads only the page selection that you explicitly make and saves it
        only after you choose to save. It does not scan unselected page content,
        form fields, network traffic, browser history, or the clipboard in the
        background.
      </p>
      <p>
        The storage permission keeps local preferences. The side-panel feature
        provides the persistent search, temporary workspace, item management,
        and settings interface. Optional access to Google Analytics is requested
        only if you enable anonymous usage analytics.
      </p>

      <h2>Optional extension analytics</h2>
      <p>
        Anonymous usage analytics is disabled by default. If you enable it in
        Settings &gt; General, the extension sends only these events to Google
        Analytics 4:
      </p>
      <ul>
        <li>
          <code>open_side_panel</code>, when the side panel opens; and
        </li>
        <li>
          <code>open_in_page_search</code>, when double-Shift successfully opens
          in-page search.
        </li>
      </ul>
      <p>
        These requests include a random installation identifier and technical
        session values needed to count events. SnippetVault does not send saved
        content, labels, contexts, searches, page titles, URLs, domains,
        clipboard data, backups, record IDs, errors, or stack traces. Requests
        omit credentials and referrer information. Google may still observe
        ordinary connection metadata such as your IP address and browser user
        agent and processes analytics data under its own
        {" "}
        <a href="https://policies.google.com/privacy">Privacy Policy</a>.
      </p>
      <p>
        You can disable analytics at any time in Settings &gt; General. This
        removes the optional Google Analytics host permission and prevents
        future events. It does not remove aggregate events already received by
        Google.
      </p>

      <h2>Backups</h2>
      <p>
        You can manually export a versioned JSON backup with the .sv extension.
        Backups can contain snippet contents, labels, contexts, secrets, full
        URLs, and source metadata in readable form. They are not encrypted and
        are never uploaded by SnippetVault. Keep exported files private.
      </p>
      <p>
        Import previews a selected backup and, after confirmation, fully
        replaces local business data. It does not merge records. Search indexes
        and interface preferences are excluded from backups, and expired
        temporary items are not restored.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Vault records remain until you delete them or replace local data through
        an import. Temporary records remain until their expiry time, unless you
        delete, extend, or promote them first. Expired records are removed from
        normal storage and search, but SnippetVault does not promise forensic
        deletion from browser files or storage media.
      </p>
      <p>
        You can delete records from the extension. Removing the extension and
        clearing its browser storage removes the live extension data available
        to SnippetVault. Exported .sv files are separate files under your
        control and must be deleted separately.
      </p>

      <h2>Website analytics</h2>
      <p>
        The public SnippetVault website does not receive your extension records
        and has no account or data-entry form. It uses the following services to
        understand site traffic and improve the website:
      </p>
      <ul>
        <li>
          <strong>Google Analytics 4</strong> measures page visits and general
          website usage. Google may use cookies or similar browser storage and
          processes data under its
          {" "}
          <a href="https://policies.google.com/privacy">Privacy Policy</a>.
        </li>
        <li>
          <strong>Ahrefs Web Analytics</strong> measures page visits using its
          cookie-free analytics service. See the
          {" "}
          <a href="https://ahrefs.com/legal/privacy-policy">Ahrefs Privacy Policy</a>.
        </li>
        <li>
          <strong>Microsoft Clarity</strong> may be enabled to understand page
          interactions and improve usability. When enabled, it may collect
          interaction, device, session, and diagnostic data and may use cookies
          or similar storage subject to consent requirements. See the
          {" "}
          <a href="https://privacy.microsoft.com/privacystatement">
            Microsoft Privacy Statement
          </a>
          .
        </li>
      </ul>
      <p>
        The website is delivered through Cloudflare, which necessarily receives
        request and connection information to serve and protect the site. See
        the
        {" "}
        <a href="https://www.cloudflare.com/privacypolicy/">
          Cloudflare Privacy Policy
        </a>
        . You can restrict website cookies and scripts using your browser
        controls. Provider retention and deletion are governed by their
        respective policies and account settings.
      </p>

      <h2>Sharing, sale, and advertising</h2>
      <p>
        SnippetVault does not sell extension user data, use it for personalized
        advertising, or allow people working on SnippetVault to read your local
        records. Extension analytics is shared only with Google after your
        opt-in and only within the narrow event boundary above. Website traffic
        data is processed by the listed website providers.
      </p>
      <p>
        SnippetVault&apos;s use of user data complies with the Chrome Web Store
        User Data Policy, including the Limited Use requirements. Data handled
        through browser permissions is used only to provide or improve the
        extension&apos;s disclosed, user-facing purpose.
      </p>

      <h2>Security</h2>
      <p>
        Local storage and exported backups are readable, not encrypted. Anyone
        with access to your browser profile, local files, extension DevTools, or
        device malware may be able to read them. SnippetVault is not a password
        manager or production secret manager. Use an access-controlled secret
        manager for production credentials.
      </p>

      <h2>Changes and contact</h2>
      <p>
        This policy will be updated when the product&apos;s data practices change.
        The date at the top identifies the latest revision. For privacy
        questions, email
        {" "}
        <a href={`mailto:${SNIPPETVAULT_SUPPORT_EMAIL}`}>
          {SNIPPETVAULT_SUPPORT_EMAIL}
        </a>
        . You may also open a non-sensitive issue in the
        {" "}
        <a href={`${SNIPPETVAULT_GITHUB_URL}/issues`}>SnippetVault repository</a>.
        For a vulnerability or a report containing sensitive information, use
        the repository&apos;s
        {" "}
        <a href={`${SNIPPETVAULT_GITHUB_URL}/security`}>private security channel</a>
        {" "}
        and do not post the details publicly.
      </p>
    </LegalDocument>
  );
}
