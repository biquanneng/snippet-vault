# Anonymous usage analytics

SnippetVault supports optional Google Analytics 4 usage analytics. Analytics is
disabled by default and can be enabled or disabled under **Settings > General**.

## Data boundary

The extension sends only these allowlisted product events after the user opts
in:

- `surface_opened`, with `side_panel` or `in_page_search`;
- `search_submitted`, with the surface and record kind, but never the query;
- `snippet_saved`, with the surface, record kind, and `create` or `edit`;
- `workspace_extended` and `workspace_promoted`, with the surface.

The transport also supplies a random installation identifier, extension
version, UI language, and screen size. As with any HTTPS request, Google can
observe connection metadata such as the IP address and browser user agent.

Snippet content, labels, contexts, search queries, source titles, source URLs,
domains, clipboard data, backup contents, record IDs, expiry values, errors,
and stack traces must never be passed to analytics. Do not enable WXT's
`autoTrack`, automatic page tracking, `identify`, or error reporting without a
new product decision and security review.

## Transport

Manifest V3 extensions cannot execute the remotely hosted `gtag.js` script.
SnippetVault therefore sends HTTPS requests directly to
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
