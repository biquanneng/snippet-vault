# SnippetVault

SnippetVault is a local-first browser extension for developers who need to
organize important but scattered text: access keys, secret keys, tokens,
endpoints, commands, notes, and short-lived working data.

Its core workflow is deliberately small:

1. Select page content, convert it to Markdown, label it, and save it.
2. Create a labeled text or Markdown snippet directly from the search panel.
3. Double-press `Shift` to search and copy saved information.
4. Click the toolbar icon to keep search and the temporary workspace open in
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

Press `Shift` twice within 400ms to open the search modal. The **Vault** tab
groups records by source domain; **Temporary** keeps active temporary records
in a flat list. Press `Enter` to submit a query; typing alone does not search.
Saved Markdown is rendered as a readable, safe React view, and matched terms
are highlighted after authoritative records are loaded. Empty searches can be
paged independently in either tab. Use **New** to save manually entered text or
Markdown with labels and an optional context. Vault records require at least one
label; labels remain optional for temporary workspace records. The active tab
decides whether the record is permanent or expires from the temporary
workspace; manual records do not claim a webpage source. Use the refresh button
next to **New** to reload the current result set without changing the active tab
or query.

Existing records can be edited from the same result list. Editing updates
content, labels, and context while preserving the record type, captured source,
and creation time; temporary records can also receive a new future expiry.

Click the SnippetVault toolbar icon to open or close the same retrieval
experience in Chrome's global side panel. SnippetVault does not use an action
popup; the side panel remains available while switching between supported web
pages.

SnippetVault supports English and Simplified Chinese. It follows Chrome's
language by default; open the side panel settings to override that choice. The
preference is stored locally and updates the side panel, selection tooltip, and
in-page search modal without reloading the current website.

SnippetVault follows the operating-system theme by default. Use the theme
control in side panel settings to choose light or dark explicitly. Theme changes
stay local to the extension UI and never restyle the current website.

The browser shortcut opens the search side panel even when content scripts
cannot run. Its suggested key is `Ctrl+Shift+K` (`Command+Shift+K` on macOS);
the current assignment can be viewed from side panel settings and remapped in
Chrome's extension shortcut manager.

Side panel settings are organized into **General**, **Contexts & workspace**,
**Labels**, and **Storage**. Contexts combine a name and one of the preset
colors; saved snippets keep the combination selected at save time. New
temporary records expire after seven days by default; this can be changed to
any whole number of at least one day without changing existing records. The
Storage page only reserves the future Cloudflare R2 backup location—no cloud
connection, credential storage, backup, or restore is active.

Runtime and manifest messages share `locales/en.json` and
`locales/zh_CN.json`. After changing locale keys, run:

```bash
pnpm exec wxt prepare
```

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
