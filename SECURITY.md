# Security Policy

SnippetVault handles API keys, tokens, credentials, and other sensitive text.
Security reports must be handled privately.

## Reporting a vulnerability

Do not open a public GitHub issue, discussion, or pull request for an
unresolved vulnerability.

Use GitHub Private Vulnerability Reporting from the repository's **Security**
tab. Include:

- affected commit or version;
- browser and operating system;
- reproduction steps;
- expected and observed behavior;
- potential exposure or impact;
- a minimal proof of concept using synthetic data only.

If Private Vulnerability Reporting is not enabled, contact the repository owner
privately and ask for a secure reporting channel without including exploit
details in the first message.

Do not access, retain, or transmit another person's data while investigating.

## Scope

SnippetVault intentionally stores captured records and its derived search index
as plaintext in the browser profile. Reading data through local filesystem
access, malware, the user's browser account, or extension DevTools is outside
the product's protection boundary and is not by itself a vulnerability.
FlexSearch's document store is disabled, so the index does not keep a second
full document copy and returns record IDs only. The derived index still contains
plaintext-derived search terms; disabling the document store is data
minimization, not encryption.

Saved Markdown is parsed into React elements without HTML injection. Arbitrary
raw HTML remains inert text, links are limited to `http`, `https`, and `mailto`,
and image syntax never causes a remote image request.

Local backups are readable JSON and can contain snippet contents, secrets, full
URLs, and source metadata. Anyone who can read the exported file can read that
data. Import is restricted to verified extension pages, strictly validated,
previewed, and then applied as a full transactional replacement rather than a
merge. See [Backup import and export security](docs/backup-import-export-security.md)
for the threat and failure boundary.

Anonymous usage analytics is optional and disabled by default. When enabled,
the extension sends a small allowlist of fixed feature events plus basic
technical metadata to Google Analytics 4. It never includes snippet content,
labels, contexts, search queries, source metadata, clipboard data, backups,
record IDs, errors, or stack traces. The public GA4 measurement ID is not an
authentication credential, so analytics traffic can be forged; it does not
protect SnippetVault data. See [Anonymous usage analytics](docs/analytics.md)
for the event contract and failure boundary.

High-priority reports include:

- captured content exposed to ordinary web pages or an unauthorized extension
  context;
- storage corruption, migration failures, or search revision mismatches that
  discard or return incorrect records;
- a privacy-lock bypass if the optional UI feature is implemented;
- sensitive values exposed to web pages or other extensions;
- logging, telemetry, or network leakage outside the documented analytics
  allowlist;
- unsafe import, export, backup, or restore behavior;
- permission escalation or unintended page capture;
- remote-code or dependency supply-chain compromise;
- expired data remaining accessible through normal product flows.

## Supported versions

Before the first public release, only the latest `dev` commit is maintained and
it must not be trusted with production secrets.

After public release, the latest published version will receive security fixes.
Older versions may be unsupported unless a release advisory states otherwise.

## Disclosure

Please allow maintainers time to reproduce, fix, test, and release a correction
before public disclosure. Maintainers should credit reporters when requested
and publish an advisory after users have a safe upgrade path.
