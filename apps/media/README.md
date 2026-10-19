# SnippetVault media

This standalone Remotion project generates SnippetVault marketing media from
sanitized product screenshots and recordings. Chrome Web Store screenshots are
the first supported output. Social images and product videos should be added as
new compositions in this same project.

## Current compositions

- Five English Chrome Web Store screenshots
- Five Simplified Chinese Chrome Web Store screenshots
- One contact sheet for each language
- One global 440x280 small promotional tile
- One global 1400x560 marquee promotional image

The default Studio previews intentionally show an `Awaiting sanitized
screenshot` placeholder. Production rendering stops if any required screenshot
is missing, so placeholder artwork cannot be mistaken for a finished asset.

## Screenshot inputs

Place screenshots at the paths documented in
`public/screenshots/chrome-store/README.md`. Use a clean browser profile and
synthetic records only. Never capture real tokens, API keys, source URLs,
project names, local paths, email addresses, or backup contents.

The V1 acceptance decision, current story, composition requirements, and
the capture checklist are recorded in
[`docs/chrome-store-screenshots.md`](docs/chrome-store-screenshots.md).

## Store listing copy

The Chrome Web Store name, descriptions, permission justifications, and
privacy-practice declarations are in
[`docs/chrome-web-store-listing.md`](docs/chrome-web-store-listing.md).

## Commands

```bash
cd apps/media
pnpm install --frozen-lockfile
pnpm typecheck
pnpm studio
pnpm preview:store
pnpm render:store
pnpm verify:store
```

Use `pnpm render:store -- --locale en` or `--locale zh-CN` to render one
language. Without `--locale`, both languages are rendered.

Rendered files are written under `output/` and are not committed. Small final
assets approved for a release can be copied into a versioned deliverables
directory later; rendered videos should remain outside Git.

The global promotional images are rendered to
`output/chrome-store/promo/small-promo.png` and
`output/chrome-store/promo/marquee.png`. Chrome does not localize these two
slots, so they use the English-first product identity and avoid long copy.

## Adding future media

Keep product claims in language-specific content modules and visual decisions in
the shared brand theme and components. Add future composition groups under:

```text
src/compositions/
├── chrome-store/
├── social/
└── video/
```

Install video or audio packages only when the first video composition needs
them. Keep all Remotion packages on the same version.
