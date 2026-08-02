# Anonymous usage analytics

SnippetVault supports optional Google Analytics 4 usage analytics through the
WXT Analytics module and a project-owned collection provider. Analytics is
disabled by default and can be enabled or disabled under **Settings > General**.

## Data boundary

The extension sends only these two product-entry events after the user opts in:

- `open_side_panel`, when Chrome reports that the side panel opened, with a
  side-panel document-open fallback for Chrome versions without that event;
- `open_in_page_search`, when double-Shift successfully opens in-page search.

The transport supplies a random installation identifier so GA4 can aggregate
usage without an account. It does not explicitly send extension version,
language, screen size, operating system, or browser version. As with any HTTPS
request, Google can still observe connection metadata such as the IP address
and browser user agent.

Search submissions, saves, copies, edits, deletes, filters, workspace actions,
backup actions, snippet content, labels, contexts, search queries, source
titles, source URLs, domains, clipboard data, backup contents, record IDs,
expiry values, errors, and stack traces must never be passed to analytics. Do
not enable WXT's `autoTrack`, automatic page tracking, `identify`, or error
reporting without a new product decision and security review.

## Transport

Manifest V3 extensions cannot execute the remotely hosted `gtag.js` script.
The WXT module forwards UI events to the extension background, where the custom
provider sends HTTPS requests directly to
`https://www.google-analytics.com/g/collect`, the GA4 web collection endpoint
used by the packaged `gsc-vault` extension. Requests contain the public
measurement ID `G-3WMCRSJL96`; no API secret or remotely hosted JavaScript is
required.

The manifest declares access to the Google Analytics origin as optional. Chrome
asks for it only when the user enables analytics, and SnippetVault removes it
when analytics is disabled. Requests omit credentials and referrer information,
so an in-page event does not disclose the current page URL through the request.

The `/g/collect` wire format is not a stable public API contract. Keep transport
coverage in place and verify ingestion after dependency, browser, or GA4 changes.
Moving to the documented Measurement Protocol later would require an API secret
or a trusted proxy and a new security review.

## Failure behavior

- Analytics failures never block saving, searching, copying, or workspace
  actions.
- Events are not persisted or queued for later upload.
- Network failures are dropped rather than retried with user data.
- Disabling analytics prevents future events; it does not remove aggregate
  events already received by Google Analytics.
- The analytics preference and random installation identifier are local
  extension preferences and are intentionally excluded from `.sv` backups.
