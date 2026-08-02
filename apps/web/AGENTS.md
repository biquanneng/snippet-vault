# SnippetVault Web App Guidelines

## Scope

This directory is the standalone public web application for SnippetVault. It
deploys independently from `biqn-dev`, while its public URLs remain under
`https://biqn.dev/snippetvault`.

## Architecture

- Next.js App Router with `basePath: "/snippetvault"`.
- OpenNext deploys the app to the `biqn-snippetvault` Cloudflare Worker.
- Product pages, guides, content, assets, sitemap, metadata, and analytics are
  owned here.
- Authored guide Markdown is compiled into `lib/snippetvault/content-data.ts`
  before development and production builds.

## Boundaries

- Do not import source files from `biqn-dev`, `apps/extension`, `apps/media`, or
  another repository at runtime.
- Treat `components/ui` as local vendor-like primitives. Customize through
  product composition and semantic tokens instead of product branches in those
  primitives.
- Internal `next/link` paths are app-relative (`/`, `/guides`); the Next.js base
  path supplies `/snippetvault`. Canonical URLs and public asset URLs include
  `/snippetvault` explicitly.
- Keep `app/globals.css` to framework imports, shared semantic tokens, and base
  rules. Product token overrides belong in `app/tokens.css`; scoped product
  motion rules belong in `components/snippetvault/snippetvault.css`.
- Do not commit generated build output, secrets, or production data.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm build:cloudflare
```

Run `pnpm verify` before handoff when feasible. Do not deploy without an
explicit user request.
