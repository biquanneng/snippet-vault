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

## Story

Slide copy lives in `src/content/store-copy.ts`.

| Slide | Message | 0.4.0 source to capture |
| --- | --- | --- |
| 01 | Find any snippet in seconds | In-page search, Vault tab, submitted query, several results with labels and sources |
| 02 | Copy twice. Saved. | Page selection just after Command/Ctrl+C twice, showing the quick save confirmation (Undo / Move to vault / More) |
| 03 | Double-Shift to search anywhere | In-page search panel over the current document, query with highlighted matches |
| 04 | Keep temporary work temporary | In-page Temporary tab with expiry, `Extend +N days`, and `Move to vault` |
| 05 | Local by default. Encrypted backups. | Side-panel Settings → Storage with the encrypted export option or passphrase dialog |

> [!IMPORTANT]
> The V1 source captures below were taken on 0.3. They show contexts, the
> selection tooltip, side-panel search, and the readable JSON backup, all of
> which changed in 0.4.0. Recapture all five English sources and add the five
> `zh-CN` sources before submitting 0.4.0. Keep the same filenames.

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

## 0.4.0 capture checklist

- Build 0.4.0 and use an isolated profile:
  `pnpm build && pnpm test:browser -- --load-extension` in `apps/extension`.
- Seed only synthetic records. Use fake but format-valid credentials (for
  example the AWS documentation key `AKIAIOSFODNN7EXAMPLE`) so detected labels
  appear without exposing anything real.
- One locale and one theme per set; switch the UI language under
  Settings → General before capturing the `zh-CN` set.
- Slides 01 and 03 should not overlap: 01 shows the Vault tab and grouped
  results, 03 shows the panel opening over a document.
- Slide 01 should not reuse the Temporary tab, which belongs to slide 04.

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
