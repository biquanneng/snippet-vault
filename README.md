# SnippetVault

SnippetVault is a local-first browser extension for developers who need to
organize important but scattered text: access keys, secret keys, tokens,
endpoints, commands, notes, and short-lived working data.

Its core workflow is deliberately small:

1. Select page content, convert it to Markdown, label it, and save it.
2. Double-press `Shift` to search and copy saved information.
3. Click the toolbar icon to keep search and the temporary workspace open in
   Chrome's side panel.

SnippetVault is being developed as an open-source product by
[biqn.dev](https://biqn.dev). The hosted extension will be built from the same
public source code.

> [!WARNING]
> SnippetVault is in early development and stores records as plaintext in the
> browser profile. Do not use it for production secrets unless you accept that
> local machine access, malware, or extension DevTools can read that data.

## Product principles

- Convenience and transparent trust boundaries come first.
- Captured content is sensitive by default, regardless of its label.
- Persistent records and the local search index are plaintext in the extension
  origin's IndexedDB.
- No account and no SnippetVault-hosted cloud are required.
- No captured data, source URL, or search query is sent to biqn.dev, analytics,
  AI services, or another remote service.
- Product usefulness and user trust take priority over promotion.

## Development

Prerequisites:

- Node.js 24
- pnpm 10
- Google Chrome

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm compile
pnpm test
pnpm build
```

The current implementation targets Chrome Manifest V3 only. Firefox packaging
and compatibility work are intentionally deferred.

Open an isolated Chrome profile for manual extension testing:

```bash
pnpm build
pnpm test:browser -- --load-extension
```

Use a named profile when a test needs persistent browser state:

```bash
pnpm test:browser -- --name tooltip --url https://example.com --load-extension
```

SnippetVault runs automatically on supported Chrome web pages. Select content
on an HTTP or HTTPS page, then choose a label and save it. The explicitly
selected HTML fragment is converted to Markdown; raw HTML and remote images are
not stored. Chrome built-in pages, the Chrome Web Store, and other protected
surfaces do not allow extension content scripts.

Press `Shift` twice within 400ms to open the search modal. The **机密** tab
groups records by source domain; **临时工作区** keeps active temporary records
in a flat list. Press `Enter` to submit a query; typing alone does not search.
Saved Markdown is rendered as a readable, safe React view, and matched terms
are highlighted after authoritative records are loaded. Empty searches can be
paged independently in either tab.

Click the SnippetVault toolbar icon to open or close the same retrieval
experience in Chrome's global side panel. SnippetVault does not use an action
popup; the side panel remains available while switching between supported web
pages.

The UI foundation uses Tailwind CSS v4 and shadcn/ui. Add shadcn components
through the configured CLI instead of copying them by hand:

```bash
pnpm exec shadcn add button
```

Generated directories such as `.output/` and `.wxt/` must not be committed.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Security issues must not be reported in a public issue. Follow
[SECURITY.md](SECURITY.md) instead.

## License

SnippetVault source code is licensed under the
[Mozilla Public License 2.0](LICENSE). MPL-2.0 is a file-level copyleft
license: when you distribute modified MPL-covered files, those files and their
source remain available under MPL-2.0.

The SnippetVault name, official logos and icons, extension-store listing
assets, and biqn.dev branding are not licensed under MPL-2.0. Public forks may
use the code, but must follow [TRADEMARKS.md](TRADEMARKS.md) and use a distinct
product identity unless separate permission is granted.
