# Contributing to SnippetVault

Thank you for helping improve SnippetVault. This project stores sensitive user
data, so a small change can have consequences beyond its visible UI. Keep
changes focused, explain security implications, and verify the behavior you
claim.

## Before starting

1. Search existing issues and pull requests.
2. For a substantial product, permission, storage, encryption, or dependency
   change, open a proposal before implementation.
3. Never include real credentials, private URLs, or captured user data in an
   issue, fixture, screenshot, commit, or pull request.

Security vulnerabilities follow [SECURITY.md](SECURITY.md), not the public issue
tracker.

## Branch workflow

- `main` is releasable and maps to published releases.
- `dev` is the integration branch.
- Branch from `dev` using `feature/*`, `fix/*`, `docs/*`, or `chore/*`.
- Open normal pull requests into `dev`.
- Release pull requests promote reviewed changes from `dev` to `main`.
- Direct pushes to `main` and `dev` are not accepted.

## Local setup

```bash
pnpm install
pnpm dev
```

Run the baseline checks before opening a pull request:

```bash
pnpm compile
pnpm test
pnpm build
```

The current release target is Chrome Manifest V3. Do not claim Firefox support
until the product scope, packaging scripts, and browser-level checks are added
together.

## Pull requests

A pull request should:

- solve one problem;
- explain why the change is needed;
- describe user-visible behavior;
- identify data, permission, privacy, and security impact;
- include tests or explain the verification gap;
- update product or contributor documentation when decisions change;
- avoid generated `.output/` and `.wxt/` content;
- avoid unrelated formatting or refactoring.

Dependencies require maintainer approval. Explain why existing platform APIs and
project utilities are insufficient before proposing one.

## Licensing contributions

The project source code is licensed under
[MPL-2.0](LICENSE). By submitting a contribution, you agree that you have the
right to provide it and that it may be distributed under MPL-2.0.

- Add `SPDX-License-Identifier: MPL-2.0` to new project-owned source files when
  the file type supports comments.
- Preserve existing copyright, attribution, and license notices.
- Identify third-party code or assets in the pull request and confirm that
  their terms are compatible with this repository.
- Do not apply the project's MPL notice to third-party or generated files.

The code license does not grant rights to the SnippetVault name, official brand
assets, extension-store identity, or biqn.dev branding. See
[TRADEMARKS.md](TRADEMARKS.md).

## Commit messages

Describe the reason for the change in the subject. For decisions with meaningful
constraints or rejected alternatives, use git trailers such as:

```text
Constraint: Business data and the search index cannot share one transaction
Rejected: Roll back a saved record after index failure | risks data loss
Confidence: high
Scope-risk: narrow
Tested: pnpm compile; pnpm test; pnpm build
Not-tested: Chrome manual interaction
```

Maintainers may squash fixup commits during merge.

## Product and security boundaries

Contributions must preserve these rules:

- capture only text the user explicitly selects or enters;
- keep persisted data inside the extension origin and document that it is
  plaintext in the browser profile;
- keep business records authoritative and rebuild derived indexes after
  revision mismatches;
- do not log or transmit captured content or search queries;
- request the minimum browser permissions;
- do not add remote executable code;
- keep marketing out of the core save and retrieve flows;
- keep search and temporary workspace behavior keyboard-friendly.

Automated coding agents must follow any local guidance supplied by the
maintainers.
