# SnippetVault 视觉设计规范

状态：生效
更新时间：2026-10-19

适用范围：`apps/extension`（内容脚本浮层 + sidepanel）。
技术基础：WXT + React + Tailwind v4 + shadcn/ui（`style: radix-nova`，`iconLibrary: lucide`）。

## 1. 设计方向

SnippetVault 是开发者工具，大部分界面以 Shadow DOM 浮层的形式出现在任意网页上，
处理的又多是 Key、Token 等敏感内容。

关键词：**安静、紧凑、可信**。参考 Raycast / Linear 的命令面板。

- 不与宿主页面抢视觉，不做品牌化装饰；
- 信息密度优先于留白；
- 任何宿主页面背景下都必须清晰可读。

## 2. 颜色

- 基色为 shadcn **neutral**（`components.json` 中 `baseColor: neutral`），全部颜色
  token 定义在 `apps/extension/assets/globals.css` 的 `:root, :host` 与 `.dark` 中，
  均为零彩度 `oklch`。
- 主色（`primary`）为黑 / 白，不设品牌强调色。
- 彩色只用于语义：`destructive`、敏感内容提示、成功反馈（sonner）。
- 业务代码只使用语义 token（`bg-muted`、`text-muted-foreground`、`border` 等），
  禁止直接写 Tailwind 调色板颜色（如 `bg-blue-500`）。
- 浮层禁止毛玻璃或半透明背景；使用 `bg-popover` + `border` + `shadow-lg`。

## 3. 字体

- 西文使用打包在扩展内的 **Inter**（`@fontsource-variable/inter`，SIL OFL 1.1，
  仅拉丁子集约 48KB），保证在任何系统和宿主页面上渲染一致；不发起任何网络请求。
- 字体由 `apps/extension/lib/brand-font.ts` 通过 `document.fonts` 以二进制注册，
  字族名为 `SnippetVault Inter`。不使用 CSS `@font-face`，原因：Shadow DOM 内的
  `@font-face` 不生效；`chrome-extension:` 地址需设为 web-accessible，会被网站探测；
  `data:` 地址会被宿主页严格的 `font-src` CSP 拦截。
- 中文不打包，回落到系统字体。`font-sans` 完整字体栈：

  ```
  "SnippetVault Inter", ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB",
  "Microsoft YaHei", sans-serif
  ```

- sonner 的样式表会给吐司容器写死系统字体，`globals.css` 中以
  `[data-sonner-toaster][data-sonner-theme]` 覆盖为 `font-sans`。
- `font-mono`（`ui-monospace` 栈）用于片段内容、Key、命令、代码块、`kbd`、URL。

字号层级：

| 类名 | 尺寸 | 用途 |
|---|---|---|
| `text-base` | 16px | 标题、搜索输入框 |
| `text-sm` | 14px | 正文、列表主体、Markdown 正文、表单控件 |
| `text-xs` | 12px | 辅助说明、元数据、快捷键、代码块 |

计数、分页等数字使用 `tabular-nums`。

## 4. 圆角

`--radius: 0.5rem`（8px），其余档位由 `globals.css` 中的 `--radius-*` 推导。

| 类名 | 约等于 | 用途 |
|---|---|---|
| `rounded-md` | 6px | 按钮、输入框、Badge、选区气泡 |
| `rounded-lg` | 8px | 列表项、卡片 |
| `rounded-xl` | 11px | 搜索面板、Dialog 等浮层容器 |

业务代码不写任意值圆角（如 `rounded-[4px]`），统一通过 `--radius` 控制。

## 5. 密度与间距

- 4px 网格；
- 控件默认 `h-8`，紧凑场景 `h-7`；
- 面板内边距 `p-3`；
- 图标使用 lucide `size-4`；纯图标按钮必须配 `Tooltip`，有快捷键时附 `Kbd`。

## 6. 动效

- 使用 `tw-animate-css`，时长不超过 150ms，只用淡入和轻微缩放；
- `globals.css` 已全局尊重 `prefers-reduced-motion`。

## 7. 暗色模式

跟随系统，并支持手动切换；通过 `.dark` 类切换 token，不在组件内写分支颜色。

## 8. Shadow DOM 与 rem

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

## 9. shadcn/ui 约束

- 不直接修改 `apps/extension/components/ui/` 下由 shadcn 安装的原始组件文件；
- 视觉定制只通过 CSS 变量 / token 控制；
- 产品自有的组合组件放在 `components/ui` 之外。
