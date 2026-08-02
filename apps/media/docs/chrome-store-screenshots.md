# Chrome Web Store screenshot plan

## V1 decision

The five English source captures under
`public/screenshots/chrome-store/en/` are accepted as the inputs for the first
Chrome Web Store release. Additional recaptures are not a V1 blocker.

The accepted files are user-prepared, English, light-theme PNG captures focused
on the relevant SnippetVault surface. They use the public GSC Vault
documentation as the page context and contain no known personal information or
real credentials.

Acceptance here applies to the source captures. The first 1280x800 English
store-image set is now composed with the real SnippetVault icon and the icon's
charcoal and lime brand colors.

## V1 story

| Slide | Message | Current source |
| --- | --- | --- |
| 01 | Find any snippet in seconds | Chrome side-panel search and context controls |
| 02 | Select, save, and keep moving | Page selection with labels, context, and save actions |
| 03 | Double-Shift to search anywhere | In-page search panel over the current document |
| 04 | Keep temporary work temporary | Temporary item list and item actions |
| 05 | Stay local and back up by choice | Settings storage and readable backup controls |

## V1 composition decisions

The supplied captures are authoritative. The media project must not recapture,
reconstruct, or crop inside them. Each slide preserves its complete PNG and
chooses an outer layout from the source aspect ratio:

- Slide 01 uses a left-hand message area and displays the complete portrait
  side-panel capture on the right.
- Slides 02 and 03 place the message above the complete wide capture.
- Slide 04 displays the complete near-square temporary-workspace capture on the
  left with its message on the right.
- Slide 05 places the local-backup message on the left and displays the complete
  Storage capture on the right.

The real application icon is copied from `apps/extension/assets/icon.png`; do
not redraw or replace it with a text monogram in future media. Brand colors are
derived from the same icon and centralized in `src/brand/theme.ts`.

The English contact sheet was inspected together with each 1280x800 output at
actual size. Titles scan quickly, while labels, context markers, result content,
expiry, and backup actions remain legible.

## Deferred capture improvements

These improvements are recorded for a later iteration and are not V1 blockers:

- Slide 01 should use the Vault tab, a submitted query, multiple results, an
  active context or label filter, and visible hover actions. The current source
  overlaps with the Temporary story.
- Slide 02 can collapse the full label catalog to reduce visual noise while
  preserving the fact that labels and context are optional.
- Slide 03 can use an explicit query with several highlighted results so the
  search interaction is more obvious.
- Slide 04 should eventually use the Chrome side-panel Temporary view and show
  `Extend +N days` plus `Move to vault`. Those lifecycle actions are not
  available in the in-page panel used by the current source.

When replacing a capture, keep the same filename so the media rendering command
continues to work without code changes.

## Global promotional images

The Chrome Web Store also uses two non-localized promotional assets:

- `440x280` small promotional tile: brand-led, with the real icon, product name,
  and one short promise that remains legible when reduced.
- `1400x560` marquee: charcoal-and-lime brand field with a concise product
  promise and the complete user-provided Search screenshot.

Both are rendered by `pnpm render:store` under `output/chrome-store/promo/`.
They must not contain review badges, ranking claims, fabricated UI, or a newly
captured product screenshot.

## Capture safety

- Use only public pages owned by the project or synthetic local content.
- Never capture real tokens, API keys, customer domains, private URLs, account
  details, browser-profile identities, or readable backup contents.
- Keep one locale and one theme per screenshot set.
- Preserve the user-prepared PNG source and display it in full. Framing belongs
  in the media composition; content cropping does not.
