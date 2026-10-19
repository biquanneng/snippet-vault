# Chrome Web Store listing

Copy for the Chrome Web Store developer dashboard, kept next to the store
graphics it describes. Text inside `text` blocks is meant to be pasted as is.

Written for extension version **0.4.0**. Re-check every section against the
generated `apps/extension/.output/chrome-mv3/manifest.json` and the release
notes in `docs/releases/` before each submission.

## Store listing fields

| Field | Value |
| --- | --- |
| Name (from manifest, ≤75 chars) | `SnippetVault — Developer Snippet Manager` / `SnippetVault — 开发者代码片段管理器` |
| Summary (from manifest, ≤132 chars) | See [Short description](#short-description) |
| Category | Developer Tools |
| Default language | English (`en`); also `zh_CN` |
| Homepage URL | `https://github.com/biquanneng/snippet-vault` |
| Support URL | `https://github.com/biquanneng/snippet-vault/issues` |
| Privacy policy URL | `https://github.com/biquanneng/snippet-vault/blob/main/PRIVACY.md` |

The name and summary come from `extName` and `extDescription` in
`apps/extension/locales/*.json`. Change them there, not only in the dashboard.

## Short description

**EN:** Save, search, and copy API keys, tokens, and code snippets locally in your browser — without digging through .env files.

**ZH:** 在浏览器本地保存、搜索和复制 API 密钥、Token 与代码片段，不再反复翻找 .env 文件。

## Detailed description

The long descriptions live in `docs/chrome-web-store/` so they can be edited
and pasted as whole files:

- English: [`description.en.txt`](../../../docs/chrome-web-store/description.en.txt)
- 简体中文: [`description.zh_CN.txt`](../../../docs/chrome-web-store/description.zh_CN.txt)

Paste each file's full contents into the dashboard's description field for
that language. Keep both files in step when a feature changes.

## Permission notes

User-facing summary of what each permission is for. The dashboard
justifications below are the authoritative wording.

### English

- **Read and change data on websites:** the content script runs on supported
  pages so SnippetVault can save a selection when the user presses
  Command/Ctrl+C twice and can show the in-page search panel. It does not scan
  page text, form fields, network traffic, or the clipboard in the background.
- **Storage:** stores preferences and local extension state. Snippet records
  and the search index are stored in the extension origin's IndexedDB.
- **Active tab and scripting:** when the toolbar icon is clicked on a tab that
  was already open before SnippetVault was installed or updated, the packaged
  content script is injected into that tab so the search panel can open.
- **Side panel:** shows Settings, and is used when the current page does not
  allow extensions to run.
- **Optional Google Analytics host access:** Chrome asks for this access only
  when the user enables anonymous usage data. It reports only side-panel opens
  and double-Shift in-page search opens to the GA4 collection endpoint, never
  searches or other product actions, saved content, labels, source metadata,
  clipboard data, or backups.

### 简体中文

- **读取和更改网站上的数据：** Content Script 会在支持的网页中运行，用于在用户
  按两次 Command/Ctrl+C 时保存选区，并显示页面内检索面板。它不会在后台扫描页面
  正文、表单字段、网络流量或剪贴板。
- **存储：** 用于保存偏好设置和扩展本地状态。片段记录与搜索索引保存在扩展
  Origin 的 IndexedDB 中。
- **当前标签页与脚本注入：** 在安装或更新 SnippetVault 之前就已打开的标签页中
  点击工具栏图标时，向该标签页注入扩展自带的 Content Script，以便打开检索面板。
- **侧边栏：** 显示设置；当前页面不允许扩展运行时，也在侧边栏中给出提示。
- **可选的 Google Analytics 主机访问：** 仅在用户主动开启匿名使用统计时，
  Chrome 才会请求此权限；它只向 GA4 数据收集端点报告打开侧边栏，以及双击
  `Shift` 打开页内检索，不会报告搜索和其他产品操作，也不会发送片段内容、
  标签、来源元数据、剪贴板数据或备份。

## Dashboard submission copy

Based on the generated Chrome MV3 manifest for 0.4.0, which requests
`storage`, `activeTab`, `scripting`, and `sidePanel`, declares a static content
script on `<all_urls>`, and declares optional host access to
`https://www.google-analytics.com/*`. It does not request `tabs`,
`clipboardRead`, `clipboardWrite`, or remote-code permissions.

### Single purpose

```text
SnippetVault lets developers explicitly capture selected or manually entered
text, organize it with optional labels, and retrieve or copy it later from a
local search interface and temporary workspace.
```

### `storage` justification

```text
The storage permission is used only for local extension preferences: language,
theme, the default temporary-item expiry period, the quick save destination,
and the pages or sites where the user turned quick save off. Session storage
holds a short-lived flag that tells the side panel why it was opened. Snippet
records, labels, and the local search index are stored separately in the
extension origin's IndexedDB and are never sent to analytics or a developer
server. If the user opts into anonymous analytics, chrome.storage also keeps
the opt-in preference and a random installation identifier used only for GA4
usage counts.
```

### `activeTab` justification

```text
activeTab grants temporary access to the current tab only after the user
clicks the SnippetVault toolbar icon. It is used together with scripting to
open the in-page search panel in a tab that was already open before the
extension was installed or updated, where the declared content script is not
yet running. No access is used without that click.
```

### `scripting` justification

```text
After the user clicks the toolbar icon on a tab that has no running
SnippetVault content script (because the tab predates installation or an
update), chrome.scripting.executeScript runs two packaged injections: a
one-line function that sets a flag asking the panel to open on mount, then
the content script file that ships inside the extension package. It never
injects remote code or arbitrary strings, and it is not used on any tab the
user did not act on.
```

### `sidePanel` justification

```text
The sidePanel permission provides SnippetVault's Settings (General, Labels,
and Storage, including backup export and import) alongside the current web
page. It also opens when the user clicks the toolbar icon on a page where
Chrome does not allow extensions to run, to explain why the in-page panel is
unavailable. The panel does not read the current page and does not display
remote content.
```

### Host access (`<all_urls>`) justification

```text
SnippetVault uses a static content script on supported web pages for two
user-facing features: saving the current selection when the user presses
Command/Ctrl+C twice, and opening the in-page search panel when the user
double-presses Shift. The script listens only for these key sequences. It
reads and converts only the DOM range the user selected at that moment, and
stores it with the page title and URL. When the user creates a snippet with
New, the page title and URL are offered as its source and can be removed
before saving. The script does not scan unselected page content, read form
fields, inspect network traffic, read the clipboard, inject advertising, or
transmit page data.

activeTab alone is insufficient because both keyboard gestures must work
before the user clicks the extension toolbar button. Restricting access to a
fixed site list would also prevent the core capture and search workflow on the
developer tools and documentation sites chosen by the user.
```

### Optional Google Analytics host access justification

```text
SnippetVault uses https://www.google-analytics.com/* only for optional Google
Analytics 4 collection requests. Anonymous usage analytics is off by
default and can be changed under Settings > General. When enabled, the
extension first asks Chrome for this optional permission, then sends only
open_side_panel or open_in_page_search plus a random installation identifier.
The second event is emitted only when double-Shift successfully opens in-page
search. It never reports searches or other product actions and never sends
snippet content, labels, search queries, page titles, URLs, domains,
clipboard data, backups, record IDs, expiry values, errors, or stack traces.
Disabling analytics removes the host permission. It is restricted to the
single GA4 collection host.
```

### Remote code justification

```text
SnippetVault does not use remote code. All JavaScript, CSS, search logic, and
UI assets execute from files packaged with the extension. It does not use
eval, download executable code, or load remotely hosted scripts or WebAssembly.
```

### Privacy-practice declarations

Chrome requires local-only data handling to be disclosed as well. Based on the
current feature set, select at least these user-data categories in the Privacy
Practices form:

- **Authentication information:** users may explicitly save API keys, tokens,
  passwords, account identifiers, or similar developer credentials.
- **Website content:** the extension processes and stores only text explicitly
  selected and saved by the user.
- **Web history:** saved selections, and snippets created with New unless the
  user removes the source, store the current page title, full URL, and domain
  as source metadata. Quick save exceptions store the page or site where the
  user turned quick save off. The extension does not monitor or collect
  general browsing history.
- **User activity:** only after explicit opt-in, the extension reports
  side-panel opens and double-Shift in-page search opens plus a random
  installation identifier to Google Analytics 4. Searches, other product
  actions, and saved data are excluded.

Use these data-use certifications:

- Data is used only to provide SnippetVault's single purpose.
- Data is not sold. The two opt-in entry-open events are processed by Google
  Analytics 4 only to compare use of SnippetVault's search entry points.
- Data is not used for advertising, profiling, creditworthiness, or lending.
- Saved snippets, credentials, website content, source metadata, search
  queries, clipboard data, and backups are not transmitted off the user's
  device by the extension.
- The developer and other humans cannot access locally stored content.

If the dashboard wording changes, choose the closest broader category rather
than omitting a disclosure. The store description and privacy policy must stay
consistent with these selections.

### Privacy policy requirement

SnippetVault handles website content, source URLs, and potentially
authentication information even though those records remain local. A public
privacy-policy URL is therefore required before submission. The policy must
state the same storage boundary, the YAML `.sv` backup behavior (encrypted by
default, plaintext export optional), the default-off GA4 event and
technical-metadata boundary, Google's role as the analytics processor, how
users can withdraw analytics consent, and how users can delete their local
data. Do not submit with a placeholder URL.

The policy is [`PRIVACY.md`](../../../PRIVACY.md) at the repository root,
submitted as:

```text
https://github.com/biquanneng/snippet-vault/blob/main/PRIVACY.md
```

The URL only resolves after `PRIVACY.md` is merged into `main`, and the
repository must stay public. Update the policy in the same change as any
permission, storage, analytics, or backup change.

## Listing consistency check

Checked against the source and generated Chrome MV3 manifest for 0.4.0 on
2026-10-19:

- The short descriptions exactly match the localized manifest descriptions.
- The detailed description matches quick save (Command/Ctrl+C twice), local
  label detection, New with page source, double-Shift and toolbar-icon in-page
  search, search over content, labels, and sources, the temporary workspace,
  and passphrase-encrypted YAML backups with optional plaintext export.
- Contexts and the selection tooltip were removed in 0.4.0 and are no longer
  mentioned.
- Search and the temporary workspace now live in the in-page panel; the side
  panel holds Settings only.
- The product makes no account, cloud-sync, AI-service, password-manager, or
  secure-deletion claim. Backup encryption is stated; live records are stated
  as unencrypted. Optional GA4 usage analytics is disclosed as off by default
  and excludes saved data and searches.
- The permission explanations match the generated manifest.

## Graphic asset status

| Asset | Size | Status |
| --- | --- | --- |
| Store icon | 128x128 | Ready — `public/brand/icon_128*128.png`, from the real application icon |
| Screenshots (EN) | 1280x800 ×5 | **Needs recapture** — source captures show 0.3 UI (contexts, tooltip, side-panel search, JSON backup) |
| Screenshots (ZH) | 1280x800 ×5 | **Missing** — no `zh-CN` source captures yet |
| Small promotional tile | 440x280 | Ready — `output/chrome-store/promo/small-promo.png` |
| Marquee | 1400x560 | Re-render after the EN search capture is replaced |

See [`chrome-store-screenshots.md`](chrome-store-screenshots.md) for the
screenshot story and the 0.4.0 capture checklist.

## Official Chrome references

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Supplying images](https://developer.chrome.com/docs/webstore/images)
- [`chrome.sidePanel`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [`chrome.scripting`](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [`activeTab`](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [`chrome.storage`](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Match patterns and `<all_urls>`](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [Chrome extension GA4 integration](https://developer.chrome.com/docs/extensions/how-to/integrate/google-analytics-4)
