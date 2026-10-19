# Privacy Policy

[English](#english) · [简体中文](#简体中文)

Last updated: October 19, 2026 · Applies to SnippetVault 0.4.0 and later

---

## English

This policy covers the official SnippetVault browser extension. SnippetVault
is open source and maintained by Bi Quanneng. It has no account system, no
hosted snippet database, and no cloud sync.

### In short

- Your snippets, labels, searches, source details, and backups are not sent
  to SnippetVault, its developer, or any other service.
- Records and the search index are stored in your browser profile. They are
  not encrypted there.
- Backups are files you export yourself. They are encrypted with a passphrase
  by default.
- Optional usage analytics is off by default. When you turn it on, it counts
  only two actions and never includes your data.

### Data the extension handles

Depending on how you use it, SnippetVault handles:

- text or Markdown you explicitly select and save, or type in yourself;
- labels you choose, or labels detected locally from the content format;
- for saved page selections, and for snippets created with **New** unless you
  remove the source, the page title, full URL, and domain;
- record identifiers, creation and update times, and temporary-item expiry
  times;
- pages or sites where you turned quick save off; and
- preferences such as language, theme, default expiry period, quick save
  destination, and your analytics choice.

Records, labels, metadata, and the derived search index are stored in the
extension's IndexedDB. Preferences are stored in Chrome extension storage.
Detecting labels happens entirely on your device.

### Page access and browser permissions

- **Access to websites:** a content script runs on supported webpages so you
  can save a selection by pressing Command/Ctrl+C twice and open search by
  pressing Shift twice. It listens only for these key sequences and reads only
  the selection you made at that moment. It does not scan unselected page
  content, form fields, network traffic, browsing history, or the clipboard.
- **Storage:** keeps the preferences listed above.
- **Active tab and scripting:** when you click the toolbar icon on a tab that
  was open before SnippetVault was installed or updated, the extension injects
  its own packaged content script into that tab so search can open.
- **Side panel:** shows Settings.
- **Google Analytics (optional):** requested only if you turn on usage
  analytics, and removed when you turn it off.

SnippetVault does not run remote code.

### Optional usage analytics

Usage analytics is off by default. If you turn it on under
**Settings → General**, the extension sends only these events to Google
Analytics 4:

- `open_side_panel`, when the side panel opens; and
- `open_in_page_search`, when pressing Shift twice opens in-page search.

Each request includes a random installation identifier and the technical
session values needed to count events. It never includes saved content,
labels, searches, page titles, URLs, domains, clipboard data, backups, record
IDs, errors, or stack traces. Requests omit credentials and referrer
information. Google may still see ordinary connection data such as your IP
address and browser user agent, and processes analytics data under the
[Google Privacy Policy](https://policies.google.com/privacy).

You can turn analytics off at any time in the same place. This stops future
events and removes the optional Google Analytics permission. It does not
delete events Google has already received.

### Backups

You can export a backup as a `.sv` file. Backups are encrypted with a
passphrase by default, using PBKDF2-SHA-256 and AES-256-GCM through the
browser's WebCrypto. The passphrase is never stored, and a forgotten
passphrase cannot be recovered. You can choose a plaintext export instead;
anyone with that file can read everything in it, including secrets and full
URLs.

SnippetVault never uploads backups. Importing a backup replaces your local
records after you confirm; it does not merge them.

### Retention and deletion

- Vault records stay until you delete them or replace them by importing a
  backup.
- Temporary records stay until they expire, unless you delete, extend, or move
  them to the Vault first.
- Expired records are removed from normal storage and search. SnippetVault
  does not promise forensic deletion from browser files or disks.
- Uninstalling the extension removes the data it stores in your browser.
  Exported `.sv` files are yours and must be deleted separately.

### Sharing, sale, and advertising

SnippetVault does not sell user data, use it for advertising, profiling,
creditworthiness, or lending, or let anyone read your local records.
Analytics data is shared only with Google, only after you opt in, and only
within the limits above.

SnippetVault's use of information received from Chrome APIs complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies),
including the Limited Use requirements.

### Security

Records stored in the browser are not encrypted. Anyone with access to your
browser profile, local files, the extension's DevTools, or malware on your
device may be able to read them. SnippetVault is not a password manager or a
production secret manager. Use an access-controlled secret manager for
production credentials.

### Changes and contact

This policy is updated when SnippetVault's data practices change. The date at
the top shows the latest revision, and earlier versions are in this file's Git
history.

For privacy questions, email
[support@wossoft.cn](mailto:support@wossoft.cn) or open a non-sensitive
[issue](https://github.com/biquanneng/snippet-vault/issues). To report a
vulnerability, follow [SECURITY.md](SECURITY.md) and do not post details
publicly.

---

## 简体中文

本政策适用于官方发布的 SnippetVault 浏览器扩展。SnippetVault 是开源项目，由
Bi Quanneng 维护。它没有账号体系，没有托管的片段数据库，也没有云同步。

### 概要

- 你的片段、标签、搜索、来源信息和备份不会发送给 SnippetVault、开发者或任何
  其他服务。
- 记录和搜索索引保存在你的浏览器 Profile 中，在那里没有加密。
- 备份是你自己导出的文件，默认使用口令加密。
- 可选的使用统计默认关闭。开启后只统计两种操作，且绝不包含你的数据。

### 扩展处理的数据

根据你的使用方式，SnippetVault 会处理：

- 你主动选中并保存，或自己输入的文本或 Markdown；
- 你选择的标签，或根据内容格式在本地识别出的标签；
- 保存网页选区时，以及通过“新建”创建片段且未移除来源时，记录页面标题、完整
  URL 和域名；
- 记录 ID、创建和更新时间，以及临时记录的过期时间；
- 你停用快捷保存的页面或网站；
- 偏好设置，例如语言、主题、默认有效期、快捷保存位置，以及是否开启使用统计。

记录、标签、元数据和派生的搜索索引保存在扩展的 IndexedDB 中，偏好设置保存在
Chrome 扩展存储中。标签识别完全在你的设备上完成。

### 网页访问与浏览器权限

- **访问网站：** Content Script 在支持的网页中运行，让你可以按两次
  Command/Ctrl+C 保存选区、双击 Shift 打开检索。它只监听这两种按键组合，只读取
  你当时选中的内容，不会扫描未选中的页面内容、表单字段、网络流量、浏览记录或
  剪贴板。
- **存储：** 保存上面列出的偏好设置。
- **当前标签页与脚本注入：** 在安装或更新 SnippetVault 之前就已打开的标签页中
  点击工具栏图标时，扩展会向该标签页注入它自带的 Content Script，以便打开检索。
- **侧边栏：** 显示设置。
- **Google Analytics（可选）：** 仅在你开启使用统计时请求，关闭时移除。

SnippetVault 不运行远程代码。

### 可选的使用统计

使用统计默认关闭。如果你在“设置 → 通用”中开启，扩展只会向 Google Analytics 4
发送以下事件：

- `open_side_panel`：打开侧边栏时；
- `open_in_page_search`：双击 Shift 成功打开页内检索时。

每次请求包含一个随机安装标识，以及统计事件所需的技术性会话值。请求绝不包含保存
的内容、标签、搜索词、页面标题、URL、域名、剪贴板数据、备份、记录 ID、错误信息或
堆栈。请求不携带凭据和 Referrer。Google 仍可能看到 IP 地址、浏览器 User Agent
等普通连接信息，并按照 [Google 隐私权政策](https://policies.google.com/privacy)
处理统计数据。

你可以随时在同一位置关闭统计。关闭后不再发送事件，并移除可选的 Google Analytics
权限，但不会删除 Google 已经收到的事件。

### 备份

你可以把备份导出为 `.sv` 文件。备份默认使用口令加密，通过浏览器 WebCrypto 实现
PBKDF2-SHA-256 与 AES-256-GCM。口令不会被保存，忘记口令将无法恢复备份。你也可以
选择明文导出，任何拿到该文件的人都能读取其中的全部内容，包括密钥和完整 URL。

SnippetVault 从不上传备份。导入备份会在你确认后替换本地记录，而不是合并。

### 保留与删除

- 保管库中的记录会一直保留，直到你删除它们，或通过导入备份替换。
- 临时记录保留到过期为止，除非你提前删除、延期或转入保管库。
- 过期记录会从正常存储和检索中移除。SnippetVault 不保证从浏览器文件或磁盘中
  彻底擦除。
- 卸载扩展会删除它在浏览器中保存的数据。导出的 `.sv` 文件由你自己保管，需要
  单独删除。

### 共享、出售与广告

SnippetVault 不出售用户数据，不将其用于广告、画像、信用评估或借贷，也不允许任何
人读取你的本地记录。统计数据只在你主动开启后共享给 Google，且仅限上述范围。

SnippetVault 对通过 Chrome API 获得的信息的使用，遵守
[Chrome 应用商店用户数据政策](https://developer.chrome.com/docs/webstore/program-policies/policies)，
包括“有限使用”要求。

### 安全

浏览器中保存的记录没有加密。能够访问你的浏览器 Profile、本地文件、扩展 DevTools
的人，或设备上的恶意软件，都可能读取这些记录。SnippetVault 不是密码管理器，也
不是生产环境的密钥管理工具。生产凭据请使用有访问控制的密钥管理服务。

### 变更与联系

当 SnippetVault 的数据处理方式发生变化时，本政策会随之更新。顶部日期为最新修订
日期，历史版本可在本文件的 Git 历史中查看。

隐私相关问题请发送邮件至 [support@wossoft.cn](mailto:support@wossoft.cn)，或提交
不含敏感信息的 [Issue](https://github.com/biquanneng/snippet-vault/issues)。报告
安全漏洞请按照 [SECURITY.md](SECURITY.md) 操作，不要公开细节。
