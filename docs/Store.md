# SnippetVault — Developer Snippet Manager / 开发者代码片段管理器

## Short Description / 简短描述

**EN:** Save, search, and copy API keys, tokens, and code snippets locally in your browser — without digging through .env files.

**ZH:** 在浏览器本地保存、搜索和复制 API 密钥、Token 与代码片段，不再反复翻找 .env 文件。

## Detailed Description / 详细描述

### English

```text
Keep the developer text you reuse close at hand.

SnippetVault is a local-first Chrome extension for saving webpage selections
and manually entered snippets, then finding them again when you need them.

✨ Save and find

- Select webpage text and save it from a lightweight tooltip, or create a
  snippet directly in the side panel.
- Add optional labels and a color-coded context for a project or environment.
- Double-press Shift to search from a supported webpage, or keep search open in
  Chrome's side panel.
- Search by content, label, context, or source, then copy, edit, or delete the
  result.
- Page captures are saved as Markdown with their title, URL, and domain.

⏳ Temporary workspace

- Let short-lived snippets expire automatically, extend them, or move them
  permanently to the Vault.

🔒 Local by default

- No account, cloud sync, or AI service. Optional anonymous usage analytics is
  off by default and never includes your saved data or searches.
- Snippets stay in the extension's local IndexedDB. You can export or restore a
  readable `.sv` JSON backup.
- Local records and backups are not encrypted. SnippetVault is not a password
  manager or encrypted secret vault.

Available in English and Simplified Chinese, with light and dark themes.

SnippetVault is open source under the Mozilla Public License 2.0:
https://github.com/biquanneng/snippet-vault
```

### 简体中文

```text
把经常需要的开发片段留在手边。

SnippetVault 是一款本地优先的 Chrome 扩展。它可以保存网页选区或手动输入的
片段，并在需要时快速找回来。

✨ 保存与检索

- 选中网页文字，通过轻量 Tooltip 保存；没有来源页面时，也可以直接在侧边栏
  新建片段。
- 按需添加 Label，并用带颜色的环境标记项目或运行环境。
- 在支持的网页中双击 Shift 快速检索，或把检索保持在 Chrome 侧边栏中。
- 搜索正文、Label、环境或来源，并直接复制、编辑或删除结果。
- 网页选区会保存为 Markdown，并记录页面标题、URL 和 Domain。

⏳ 临时工作区

- 让短期片段自动过期、按需延期，或者转为永久 Vault 记录。

🔒 默认留在本地

- 无需账号，不连接云同步或 AI 服务。匿名使用统计默认关闭，且绝不会包含保存的
  数据或搜索词。
- 片段保存在扩展自己的 IndexedDB 中，并支持导出或恢复可读的 `.sv` JSON 备份。
- 本地记录和备份没有加密。SnippetVault 不是密码管理器，也不是加密的机密保险库。

支持 English 和简体中文，并提供浅色和深色主题。

SnippetVault 使用 Mozilla Public License 2.0 开源：
https://github.com/biquanneng/snippet-vault
```

## Permission Notes / 权限说明

### English

- **Read and change data on websites:** the content script runs on supported
  pages so SnippetVault can react when the user explicitly selects content and
  can show the in-page tooltip and search panel. It does not scan page text,
  form fields, network traffic, or the clipboard in the background.
- **Storage:** stores preferences and local extension state. Snippet records
  and the search index are stored in the extension origin's IndexedDB.
- **Side panel:** opens the persistent search and temporary workspace surface
  when the toolbar icon is used.
- **Optional Google Analytics host access:** Chrome asks for this access only
  when the user enables anonymous usage data. It reports only side-panel opens
  and double-Shift in-page search opens to the GA4 collection endpoint, never
  searches or other product actions, saved content, labels, contexts, source
  metadata, clipboard data, or backups.

### 简体中文

- **读取和更改网站上的数据：** Content Script 会在支持的网页中运行，用于响应
  用户明确执行的文本选择，并显示页面内 Tooltip 和检索面板。它不会在后台扫描
  页面正文、表单字段、网络流量或剪贴板。
- **存储：** 用于保存偏好设置和扩展本地状态。片段记录与搜索索引保存在扩展
  Origin 的 IndexedDB 中。
- **侧边栏：** 用户点击工具栏图标时，打开常驻检索与临时工作区界面。
- **可选的 Google Analytics 主机访问：** 仅在用户主动开启匿名使用统计时，
  Chrome 才会请求此权限；它只向 GA4 数据收集端点报告打开侧边栏，以及双击
  `Shift` 打开页内检索，不会报告搜索和其他产品操作，也不会发送片段内容、
  标签、环境、来源元数据、剪贴板数据或备份。

## Chrome Web Store Dashboard Submission Copy

The following text is based on the generated Chrome MV3 manifest, not only the
source configuration. The verified manifest requests `storage`, `sidePanel`,
and static content-script access to `<all_urls>`, and declares optional host
access to `https://www.google-analytics.com/*`. It does not request `tabs`,
`activeTab`, `scripting`, `clipboardRead`, `clipboardWrite`, or remote-code
permissions.

### Single purpose

```text
SnippetVault lets developers explicitly capture selected or manually entered
text, organize it with optional labels and contexts, and retrieve or copy it
later from a local search interface and temporary workspace.
```

### `storage` justification

```text
The storage permission is used only for local extension preferences, including
language, theme, and the default temporary-item expiry period. Snippet records,
labels, contexts, and the local search index are stored separately in the
extension origin's IndexedDB and are never sent to analytics or a developer
server. If the user opts into anonymous analytics, chrome.storage also keeps
the opt-in preference and a random installation identifier used only for GA4
usage counts.
```

### `sidePanel` justification

```text
The sidePanel permission provides SnippetVault's persistent search, temporary
workspace, item-management, and settings interface alongside the current web
page. Clicking the extension toolbar icon opens this local side panel. The
panel does not read the current page on its own and does not display remote
content.
```

### Host access (`<all_urls>`) justification

```text
SnippetVault uses a static content script on supported web pages for two
user-facing features: showing a save tooltip after the user explicitly selects
page text, and opening the in-page search panel when the user double-presses
Shift. The script reads and converts only the DOM range the user selected, and
the selected content plus page title and URL are saved only after the user
clicks Save. It does not scan unselected page content, read form fields,
inspect network traffic, read the clipboard, inject advertising, or transmit
page data.

The narrower activeTab permission is insufficient because both primary
page-level gestures must work before the user clicks the extension toolbar
button. Restricting access to a fixed site list would also prevent the core
capture and in-page search workflow on developer tools and documentation sites
chosen by the user.
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
snippet content, labels, contexts, search queries, page titles, URLs, domains,
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
- **Web history:** when a page selection is saved, the current page title, full
  URL, and domain are stored as source metadata. The extension does not monitor
  or collect general browsing history.
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
state the same storage boundary, the readable `.sv` backup behavior, the
default-off GA4 event and technical-metadata boundary, Google's role as the
analytics processor, how users can withdraw analytics consent, and how users
can delete their local data. Do not submit with a placeholder URL.

## Listing Consistency Check

Checked against the current source and generated Chrome MV3 manifest on
2026-08-02:

- The short descriptions exactly match the localized Manifest descriptions.
- The detailed description matches the implemented selection Tooltip,
  Double-Shift panel, Chrome side panel, optional labels and contexts, exact
  side-panel filters, temporary expiry and extension, one-way promotion to the
  Vault, and local backup replacement flow.
- The `.sv` backup is readable JSON, not encrypted, and import replaces rather
  than merges business data. The description now states the extension.
- Manual records do not invent source metadata; page title, full URL, and domain
  are added only to explicitly saved page selections.
- The product makes no account, cloud-sync, AI-service, encryption,
  password-manager, or secure-deletion claim. Optional GA4 usage analytics is
  disclosed as off by default and excludes saved data and searches.
- The permission explanations match the generated manifest: `storage`,
  `sidePanel`, `<all_urls>` content-script access, and the single GA4 collection
  host as an optional permission.

The privacy policy is implemented in `apps/web` at the intended public URL:

```text
https://biqn.dev/snippetvault/privacy
```

Before submission, deploy the web app and verify that this exact URL is public,
loads without authentication, and points directly to the privacy policy.

## Graphic Asset Status

- Store icon: generated from the real SnippetVault application icon.
- Screenshots: five English `1280x800` images generated from the user-prepared
  source captures without internal cropping.
- Small promotional tile: `440x280`, rendered to
  `apps/media/output/chrome-store/promo/small-promo.png`.
- Marquee promotional image: `1400x560`, rendered to
  `apps/media/output/chrome-store/promo/marquee.png`.

The promotional tiles are global rather than locale-specific. They use short
English-first copy, the real icon, and the same charcoal-and-lime identity as
the screenshot set.

## Official Chrome References

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [`chrome.sidePanel`](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [`chrome.storage`](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Match patterns and `<all_urls>`](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- [Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Chrome extension GA4 integration](https://developer.chrome.com/docs/extensions/how-to/integrate/google-analytics-4)
