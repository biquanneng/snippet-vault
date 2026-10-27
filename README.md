# SnippetVault

[![GitHub stars](https://img.shields.io/github/stars/biquanneng/snippet-vault?style=flat)](https://github.com/biquanneng/snippet-vault/stargazers)
[![CI](https://github.com/biquanneng/snippet-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/biquanneng/snippet-vault/actions/workflows/ci.yml)
[![License: MPL-2.0](https://img.shields.io/badge/license-MPL--2.0-blue.svg)](LICENSE)

If SnippetVault saves you time, a ⭐ on GitHub helps other developers find it.

SnippetVault is a local-first browser extension for developers who need to
organize important but scattered text: access keys, secret keys, tokens,
endpoints, commands, notes, and short-lived working data.

Its core workflow is deliberately small:

1. Select page content and press `Command/Ctrl+C` twice to save it as Markdown
   instantly, with labels detected from the content format. With nothing
   selected, the same shortcut stashes the current page link.
2. Create a text or Markdown snippet directly from the search panel.
3. Double-press `Shift` to search and copy saved information.
4. Click the toolbar icon to open the same search on the current page;
   settings open in Chrome's side panel.
5. Open developer tools, such as the JSON tool, from **Tools**.

Records live in two places: **Secrets** for anything you keep long term, and
**Temporary** for short-lived snippets and links that expire automatically.
"Secrets" is a name, not encryption: both are stored as plaintext.

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
- Optional anonymous usage analytics is off by default. When enabled, it only
  counts side-panel opens and double-Shift in-page search opens in Google
  Analytics 4.
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

GA4 analytics sends only the two documented product-entry events to the GA4
web collection endpoint using the public measurement ID. It does not load
remote scripts or require an API secret. See
[Anonymous usage analytics](docs/analytics.md) for the exact event boundary and
disclosure requirements.

The current implementation targets Chrome Manifest V3 only. Firefox packaging
and compatibility work are intentionally deferred.

Open an isolated Chrome profile for manual extension testing:

```bash
pnpm build
pnpm test:browser -- --load-extension
```

Use a named profile when a test needs persistent browser state:

```bash
pnpm test:browser -- --name quick-save --url https://example.com --load-extension
```

SnippetVault runs automatically on supported Chrome web pages. Select content
on an HTTP or HTTPS page and press `Command+C` twice on macOS, or `Ctrl+C`
twice on Windows and Linux, within 400ms. The first copy stays a normal browser
copy; the second saves the selection silently, with no form to fill in. A short
confirmation offers **Undo**, **Move to Secrets** for temporary records, and
**More** to turn quick save off on the current page or site. Quick save writes
to Temporary by default; choose Secrets instead under
**Settings → General → Quick save**. Saving identical content to the same place
again reuses the existing record instead of creating a copy.

With nothing selected and focus outside an editable field, the same
`Command/Ctrl+C` twice stashes the current page as a link record
(`[title](<url>)`) in the quick save target. Stashing a URL that already has an
active Temporary record extends that record instead of adding a copy, and
**Undo** restores the previous expiry. The confirmation never shows the full
URL, since query strings can carry tokens; copying or opening a link record
uses the full URL. The **Stash this page** button at the top of the
**Temporary** tab does the same and always saves to Temporary.

The explicitly selected HTML fragment is converted to Markdown; raw HTML and
remote images are not stored. Labels are detected locally from the content
format: AWS and Alibaba Cloud access key IDs, GitHub tokens, JWTs, `sk-` API
keys, PEM and SSH keys, and database connection strings that include
credentials. Unprefixed random strings, such as an AWS secret key, are not
detected. Chrome built-in pages, the Chrome Web Store, and other protected
surfaces do not allow extension content scripts.

In-page SnippetVault UI is shown in the browser's top layer, so ordinary page
overlays cannot cover it. While a page has its own modal dialog open, the
browser may show SnippetVault UI without letting you interact with it.

Press `Shift` twice within 400ms to open the search modal. Double `Shift` is
ignored while typing in an input, textarea, or rich-text editor. If a site
captures the keyboard, press `Ctrl+Shift+K` (`Command+Shift+K` on macOS), or
assign another key under `chrome://extensions/shortcuts`; it opens the same
panel as the toolbar icon. The **Secrets** tab
groups records by source domain; **Temporary** keeps active temporary records
in a flat list. Press `Enter` to submit a query; typing alone does not search.
Saved Markdown is rendered as a readable, safe React view, and matched terms
are highlighted after authoritative records are loaded. Empty searches can be
paged independently in either tab; records from the current site are listed
first. Use **New** to save manually entered text or
Markdown with optional labels. Labels are preselected from the content format
until you choose labels yourself, and they are optional for both Secrets and
Temporary records. The active tab decides whether the record is
permanent or expires from Temporary. A new record captures the
title and URL of the web page you are on as its source; you can remove it
before saving, and restricted pages provide no source. Use the refresh button
next to **New** to reload the current result set without changing the active
tab or query.

Each result copies its raw content with one click. **Copy as…** wraps it as a
shell `export`, a `.env` line, a JSON field, or an HTTP header, escaping the
value and rejecting header values that contain line breaks. Converted text is
only copied, never saved.

The **Tools** tab, after **Temporary**, lists the extension's tools; the side
panel has the same **Tools** entry. The JSON tool opens in its own extension
tab (reusing it if already open) and formats, minifies, or unescapes JSON.
Formatting only rewrites whitespace, so large integers and number literals are
kept exactly. Input and output stay in that tab's memory and are never saved,
indexed, or sent anywhere.

Existing records can be edited from the same result list. Editing updates
content and labels while preserving the record type, captured source, and
creation time; temporary records can also receive a new future expiry.

Click the SnippetVault toolbar icon to open the same in-page search panel
without the keyboard shortcut. This also works in tabs that were open before
SnippetVault was installed or updated. SnippetVault does not use an action
popup. Chrome's side panel holds Tools, settings, and the guide: open it from the settings
button in the search panel, or by clicking the toolbar icon on a page where
extensions cannot run, such as Chrome built-in pages or the Chrome Web Store.
Click a label on any result to filter by it.
Temporary records can be extended by the configured default number of days or
promoted to permanent Secrets records; Secrets records cannot be converted back
to temporary records.

SnippetVault supports English and Simplified Chinese. It follows Chrome's
language by default; open the side panel settings to override that choice. The
preference is stored locally and updates the side panel, quick save confirmations,
and in-page search modal without reloading the current website.

SnippetVault follows the operating-system theme by default. Use the theme
control in side panel settings to choose light or dark explicitly. Theme changes
stay local to the extension UI and never restyle the current website.

The first time the search panel opens, a short guide explains Secrets,
Temporary, Tools, and the two shortcuts. Reopen it from **Getting started** in
the side panel.

Side panel settings are organized into **General**, **Labels**, and
**Storage**. **General** holds the theme, language, quick save target, quick
save exceptions, and the default temporary expiry. New temporary records expire
after seven days by default; this can be changed to any whole number of at
least one day. The setting is also the increment used by quick extension and
does not bulk-change existing records.

Contexts were removed in 0.4.0. When you upgrade, each record's context is
converted to a label in one atomic storage migration, so it stays searchable;
the four environment contexts become built-in labels. Export a backup before
upgrading, because the migration cannot be reversed.

The Storage page exports `.sv` backups as readable YAML (format version 2).
Backups are encrypted with a passphrase by default (PBKDF2-SHA-256 and
AES-256-GCM through WebCrypto). The passphrase is never stored and cannot be
recovered. A plaintext export is still available and contains every snippet,
secret, and source URL in readable form. Import previews the file, then fully
replaces local business data; it does not merge. Version 1 JSON backups from
earlier releases can still be imported, but SnippetVault 0.3.x cannot read
version 2 backups. Search indexes and UI preferences are excluded from backups.
See [Backup import and export security](docs/backup-import-export-security.md).
Cloudflare R2 remains a future option; no cloud connection or credential
storage is active.

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

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=biquanneng/snippet-vault&type=Date)](https://star-history.com/#biquanneng/snippet-vault&Date)
