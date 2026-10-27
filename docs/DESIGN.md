# SnippetVault 视觉设计规范

状态：生效
更新时间：2026-10-27

适用范围：`apps/extension`（内容脚本浮层 + sidepanel）。
技术基础：WXT + React + Tailwind v4 + shadcn/ui（`style: radix-nova`，`iconLibrary: lucide`）。

## 1. 设计方向

SnippetVault 是开发者工具，大部分界面以 Shadow DOM 浮层的形式出现在任意网页上，
处理的又多是 Key、Token 等敏感内容。

关键词：**安静、紧凑、可信**。参考 Raycast / Linear 的命令面板。

- 不与宿主页面抢视觉，不做品牌化装饰；
- 信息密度优先于留白；
- 任何宿主页面背景下都必须清晰可读；
- 页内检索面板是键盘优先的命令面板（Raycast / Linear ⌘K 心智），不是管理
  后台弹窗：输入即搜索、默认选中第一条、复制优先，操作集中在底部提示栏与
  动作菜单，不依赖悬停。

## 2. 颜色

- 基色为 shadcn **neutral**，全部颜色 token 定义在
  `apps/extension/assets/globals.css` 的 `:root, :host` 与 `.dark` 中。中性色带
  极低彩度的冷色相（`oklch(L 0.003–0.015 265)`），避免大面积纯白显得空；
  `background` / `card` / `popover` 在浅色模式下仍为纯白。
- 层次靠底色而不是边框：`--surface` 比 `background` 低一档，用于检索面板的
  结果列表栏与底部提示栏，列表栏与详情区之间不加分隔线；顶部输入栏、详情区保持 `background`。
- 主色（`primary`）为近黑 / 近白。品牌色为青柠：
  - `--brand`（`oklch(0.768 0.204 130.85)`，约 `#84CC16`）：焦点指示、
    选中行的淡色底（`bg-brand/10`，暗色 `/15`）；
  - `--brand-strong`（浅色更深、暗色更亮）：选中行图标等小面积图形；
  - 禁止用作正文文字色或大面积实色填充。
- 其他彩色只用于语义（`destructive`、敏感内容提示、成功反馈 sonner），不做装饰性
  用色。
- 业务代码只使用语义 token（`bg-surface`、`bg-muted`、`text-muted-foreground`、
  `border` 等），禁止直接写 Tailwind 调色板颜色（如 `bg-blue-500`）。
- 浮层禁止毛玻璃或半透明背景；使用 `bg-popover` + `border` + `shadow-lg`。

## 3. 检索面板布局与快捷键

页内检索面板是键盘优先的命令面板（⌘K 心智），不是管理后台弹窗。布局固定为
顶部输入行、中部「结果列表 + 预览」、底部提示栏三段：

- 容器贴近视口顶部（约 `12vh`），高度约 `min(560px, 76vh)`，宽度最大约
  `52rem`；
- 顶部行 `h-16`：大号无边框检索输入框 + “机密｜临时库｜工具”行内分段控件，
  `Tab` / `Shift+Tab` 循环切换范围；标签筛选显示为输入框前的可清除小标记；
- 中部左右分栏：左侧为约 46% 宽的单行结果列表，每条结果是图标加两行文本
  （内容摘要；来源与最多 2 个标签），行尾为相对时间——机密显示更新时间，
  临时库显示到期时间；右侧为选中项预览（标题、带复制按钮的内容块、来源链接、
  可点击筛选的标签、到期 / 更新 / 创建时间）；窄视口（`< 640px`）隐藏预览；
- 列表标题与预览的字体按内容类型决定（见第 4 节），不随图标推断；标签最多显示
  2 个、单个限宽并截断，给来源留出辨识空间；
- 底部提示栏 `h-11`：左侧为「新建」「设置」两个文字按钮（点击不抢输入框焦点）
  和结果条数；右侧依次提示“选择 `↑↓`”“复制 `↵`”“编辑 `⌘↵`（链接记录为
  打开）”“操作 `⌘K`”，窄视口隐藏“选择”和“编辑”。

交互以键盘为主：

| 输入 / 按键 | 行为 |
|---|---|
| 任意输入 | 120ms 防抖即搜；输入法组合期间不搜索 |
| `↑` / `↓` | 移动选中项，默认选中第一条 |
| `↵` | 复制并关闭面板 |
| `⌘/Ctrl+↵` | 编辑；链接记录改为在新标签页打开 |
| `⌘/Ctrl+E` | 编辑 |
| `⌘/Ctrl+K` | 打开动作菜单 |
| `Esc` | 关闭面板 |

- 结果过期（防抖未完成或正在加载）时 `↵` 只触发立即搜索，不对旧结果执行
  复制等操作；
- 动作菜单提供复制、打开链接、编辑、延期、转为机密、复制为 Shell / `.env` /
  JSON 字段 / HTTP Header、新建、暂存当前页、打开 JSON 工具、设置和删除；
  删除需在菜单中二次确认；
- 不设分页与刷新按钮，结果列表滚动到底自动加载下一批（每批 30 条）；
- 不使用 `⌘1`–`⌘9`、`⌘N`、`⌘T`、`⌘W` 等 Chrome 保留快捷键。

新建 / 编辑表单是面板内子页面：顶部为返回与标题，正文以等宽内容输入为主（白底、
无聚焦指示条）；下方来源、标签、到期区与底部提示栏使用 `bg-surface`，与检索面板
的分区一致；标签未选为描边、已选为 `bg-brand/10` 加对勾。底部提示栏显示
“保存 `⌘↵` / 取消 `Esc`”。

选中行背景使用 `bg-brand/10`（暗色 `/15`），图标为 `--brand-strong`，不加指示条；列表图标按记录类型
使用通用图标（终端、钥匙、数据库、链接、文档），不加载站点 logo / favicon，
标签不做彩色区分。

## 4. 字体

扩展内打包两套西文字体（均为 SIL OFL 1.1，仅拉丁子集），保证在任何系统和宿主页面上
渲染一致，不发起任何网络请求：

| 字体 | 来源 | 体积 | 字族名 | Tailwind |
|---|---|---|---|---|
| Inter | `@fontsource-variable/inter` | 约 48KB | `SnippetVault Inter` | `font-sans` |
| JetBrains Mono | `@fontsource-variable/jetbrains-mono` | 约 40KB | `SnippetVault JetBrains Mono` | `font-mono` |

- 字体由 `apps/extension/lib/brand-font.ts` 的 `registerBrandFonts()` 通过
  `document.fonts` 以二进制注册。不使用 CSS `@font-face`，原因：Shadow DOM 内的
  `@font-face` 不生效；`chrome-extension:` 地址需设为 web-accessible，会被网站探测；
  `data:` 地址会被宿主页严格的 `font-src` CSP 拦截。
- 中文不打包，两套字体栈都回落到系统中文字体。

  ```
  font-sans: "SnippetVault Inter", ui-sans-serif, system-ui, -apple-system,
             BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB",
             "Microsoft YaHei", sans-serif
  font-mono: "SnippetVault JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
             Monaco, Consolas, "Liberation Mono", "Courier New", "PingFang SC",
             "Microsoft YaHei", monospace
  ```

场景划分：

- `font-sans`（Inter）：界面文字，包括标题、按钮、菜单、表单标签、设置页、吐司、
  提示文案、笔记 / Markdown 正文、快捷键提示（`kbd` 沿用 shadcn 默认的 `font-sans`）。
- `font-mono`（JetBrains Mono）：需要逐字符辨认或原样复制的内容，包括命令、Key、
  连接串等片段内容与编辑框、Markdown 代码块与行内代码、URL、JSON 工具编辑器。
  检索面板中由 `result-summary.ts` 的 `usesMonospace()` 判断：连接串、凭据、
  命令，以及 20 字符以上无空白的单个字符串用等宽；普通文本与网页标题用
  `font-sans`。
- 等宽字体关闭连字（`--font-mono--font-feature-settings: "liga" 0, "calt" 0`，
  CodeMirror 中为 `fontVariantLigatures: none`），避免 `->`、`!=` 等被渲染成单个
  字形，与复制出的文本不一致。
- sonner 的样式表会给吐司容器写死系统字体，`globals.css` 中以
  `[data-sonner-toaster][data-sonner-theme]` 覆盖为 `font-sans`。

字号层级：

| 类名 | 尺寸 | 用途 |
|---|---|---|
| `text-base` | 16px | 标题、搜索输入框 |
| `text-sm` | 14px | 正文、列表主体、Markdown 正文、表单控件 |
| `text-xs` | 12px | 辅助说明、元数据、快捷键、代码块 |

计数、条数等数字使用 `tabular-nums`。

## 5. 圆角

`--radius: 0.5rem`（8px），其余档位由 `globals.css` 中的 `--radius-*` 推导。

| 类名 | 约等于 | 用途 |
|---|---|---|
| `rounded-md` | 6px | 按钮、输入框、Badge、选区气泡 |
| `rounded-lg` | 8px | 列表项、卡片 |
| `rounded-xl` | 11px | 搜索面板、Dialog 等浮层容器 |

业务代码不写任意值圆角（如 `rounded-[4px]`），统一通过 `--radius` 控制。

## 6. 密度与间距

- 4px 网格；
- 控件默认 `h-8`，紧凑场景 `h-7`；
- 面板内边距 `p-3`；
- 图标使用 lucide `size-4`；纯图标按钮必须配 `Tooltip`，有快捷键时附 `Kbd`。

## 7. 动效

- 使用 `tw-animate-css`，时长不超过 150ms，只用淡入和轻微缩放；
- `globals.css` 已全局尊重 `prefers-reduced-motion`。

## 8. 暗色模式

跟随系统，并支持手动切换；通过 `.dark` 类切换 token，不在组件内写分支颜色。

## 9. Shadow DOM 与 rem

内容脚本 UI 挂在 Shadow DOM 中，但 `rem` 仍然跟随宿主页面 `<html>` 的字号。
例如 `html { font-size: 62.5% }` 的站点会让整个浮层缩小 37.5%。

因此：

- 内容脚本样式入口为 `apps/extension/entrypoints/content/style.css`；
- 构建时由 `apps/extension/build/content-rem-to-px.ts`（在 `wxt.config.ts` 中注册的
  PostCSS 插件）把该入口内的 `rem` 按 `1rem = 16px` 转为 `px`，包括 `@container`
  条件；
- sidepanel 保持 `rem`，以尊重用户的浏览器字号设置；
- 新增内容脚本样式必须经由该入口引入，不要在 `content.tsx` 中直接引入
  `assets/globals.css`。

## 10. shadcn/ui 约束

- 不直接修改 `apps/extension/components/ui/` 下由 shadcn 安装的原始组件文件；
- 视觉定制只通过 CSS 变量 / token 控制；
- 产品自有的组合组件放在 `components/ui` 之外。
