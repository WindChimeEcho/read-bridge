# AGENTS.md — ReadBridge

本文件面向在 ReadBridge 仓库中工作的 AI 编码助手，提供项目架构、关键约定、已知坑点与验证命令。

## 1. 项目概览

ReadBridge 是一个本地优先（local-first）的 AI 辅助阅读应用，支持 Web、Tauri v2 桌面端与 Tauri v2 Android 端。

- **前端栈**：Next.js 14（App Router，`output: 'export'` 纯静态导出）、React 18、TypeScript（路径别名 `@/*`）、Tailwind CSS 3、Ant Design 5
- **状态与本地存储**：Zustand 5（`localStorage` 持久化）+ Dexie 4（IndexedDB，库名 `book-reader`）
- **AI 与解析**：Vercel AI SDK（`ai` v7 + `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` / `@ai-sdk/openai-compatible`）、`fflate`（EPUB / `.rbk` ZIP）、`markdown-it`、`cheerio`、`sbd`、`compromise`、`franc`、`react-markdown` + KaTeX
- **原生壳**：Tauri v2（`src-tauri/`），桌面端启用 `dialog` / `fs`，Android 端通过 `#[cfg(target_os = "android")]` 额外启用 `tauri-plugin-tts` 与 `tauri-plugin-android-fs`
- **环境要求**：Node.js `>= 22`（见 `package.json` `engines.node`）

## 2. 目录结构与分层

- `app/`：Next.js 路由入口（`/`、`/home`、`/read`、`/setting`）与跨端通用组件（`app/components/`）。路由页面只做轻量编排与视口分发，不承载重逻辑。
- `app/_views/desktop/`：桌面端视图（`DesktopShell.tsx`、`DesktopHome.tsx`、`DesktopRead.tsx`、`DesktopSetting.tsx` 及 `sider/` 右侧 AI 解析与聊天面板）。
- `app/_views/mobile/`：移动端视图（`MobileShell.tsx`、`bookshelf/`、`reader/`、`settings/` 分组设置与 8 个子页）。
- `hooks/`：桌面端与移动端共享的 Headless 业务 Hooks：
  - `useViewportMode.ts`：视口模式分发（`(max-width: 767px)` -> `'mobile'` / `'desktop'`）
  - `useBook.ts`、`useBookImport.ts`、`useBookManage.ts`、`useChapterNav.ts`、`useReadArea.ts`
  - `useSentenceAnalysis.ts`、`useWordLookup.ts`、`useChatSession.ts`、`useBackup.ts`
- `services/`：无 UI 依赖的核心领域服务：
  - 存储与缓存：`DB.ts`、`BookService.ts`、`CacheService.ts`
  - 书籍导入与分句：`Epub.ts`、`MD.ts`、`TXT.ts`、`SentenceService.ts`、`ChapterUtils.ts`
  - AI 调用：`services/ai/`（`provider.ts`、`generate.ts`、`models.ts`、`output-contracts.ts`、`think-parser.ts`、`list-parser.ts`）与 `services/analysis/sentenceController.ts`
  - 备份与恢复：`BackupService.ts`（`.rbk` ZIP，支持全量与单书，`BACKUP_FORMAT_VERSION = 1`）
  - 朗读：`ttsService.ts`、`services/tts/`
  - 平台适配层：`services/platform/`（`fileAdapter.ts`、`ttsAdapter.ts`、`backAdapter.ts`、`notify.ts`）
- `store/`：Zustand Store：
  - 持久化配置/数据：`useLLMStore`、`useStyleStore`、`useOutputOptions`、`useTTSStore`、`useHistoryStore`、`useReadingProgress`、`useBookmarkStore`、`useCacheStore`、`useSiderStore`、`useHeaderStore`
  - 临时阅读会话：`useReaderSessionStore`（与持久化 Store 解耦）
- `config/` & `constants/`：三主题色板（`config/theme.ts`）、LLM 默认配置（`config/llm.ts`）及静态常量。
- `i18n/`：`i18n/index.ts`、`i18n/useTranslation.ts` 与 `i18n/locales/{en,zh}.json`。
- `types/` & `utils/`：类型定义与纯工具函数（含 `utils/platform.ts`）。
- `src-tauri/`：Tauri v2 Rust 宿主与能力配置（`src-tauri/src/lib.rs`、`src-tauri/Cargo.toml`）。
- `tests/`：AI SDK 冒烟测试（`tests/ai-sdk-smoke.test.mjs`）、Vitest 单元测试（`tests/*.test.ts`）与测试夹具（`tests/fixtures/`）。
- `docs/`：重构与移动端方案文档（`android-mobile-work-plan.md`、`android-setup-guide.md`、`refactor-work-plan.md`）。

## 3. 核心开发约定

1. **双端分层（禁止重复业务逻辑）**
   - 桌面端（`>= 768px`）与移动端（`< 768px`）是独立表现层，通过 `useViewportMode` 分发；状态与业务逻辑必须沉淀在 `hooks/`、`services/`、`store/` 中复用。
2. **纯静态导出约束**
   - `next.config.js` 开启了 `output: 'export'`、`images.unoptimized: true`、`reactStrictMode: false`。
   - **禁止**新增 Next.js Route Handlers（`app/api/**`）、Server Actions 或仅限 SSR 的 API。
   - 删除或移动 `app/` 下路由后，先清理 `.next/` 目录再运行 `tsc --noEmit`，避免 `.next/types` 残留报错。
3. **平台适配与通知规范**
   - 文件读写、TTS、Android 返回键、轻提示必须走 `services/platform/` 与 `utils/platform.ts`（`web` / `tauri-desktop` / `tauri-android`），不要在 UI 组件中直接硬耦合 `@tauri-apps/*` 或 `tauri-plugin-*`。
   - 服务层与 Hooks 内提示使用 `services/platform/notify.ts`（在 `app/components/layout/theme-provider.tsx` 中绑定到 Antd `App.useApp().message`），避免直接调用 Antd 静态 `message.*`。
4. **三主题系统**
   - 支持 `paper`（默认暖纸）/ `light` / `dark`，定义在 `config/theme.ts`，由 `ThemeProvider` 与 `app/globals.css` 中的 `--rb-*` CSS 变量统一驱动。
   - 修改 `useStyleStore` 持久化迁移逻辑时注意保留 `mergeStyleState` 对旧版自定义文字色的兼容处理。
5. **i18n 规则**
   - `i18n/index.ts` 使用**单花括号**占位符 `{param}`（**不要**写成 `{{param}}`）。
   - 新增或修改文案时必须同步维护 `i18n/locales/en.json` 和 `i18n/locales/zh.json`，保持键路径与占位符一致。
6. **备份与密钥安全**
   - `.rbk` 全量备份默认剥离 Provider / TTS API Key（`includeApiKeys: false`）；覆盖恢复时，若备份不含密钥，需保留设备本地已有密钥。
   - 绝不输出、硬编码或提交任何 API Key 及本地测试文件（如已被 `.gitignore` 忽略的 `key.json`）。

## 4. 既定行为与注意事项（改动前请确认）

- **Markdown 导入规则（`services/MD.ts`）**：首个 `#`（H1）作为书名，`##`（H2）作为章节切分边界。
- **桌面端选句交互（`app/read/components/readArea/index.tsx`）**：点击句子左侧单选圆圈触发整句 AI 解析；正文文本保留原生拖选/划词体验。
- **流式取消（`services/ai/generate.ts`）**：切句、关面板或重生成触发的 `AbortError` 属于正常取消，已过滤不作为控制台错误噪音。
- **移动端 Toast 遮挡防护（`app/globals.css`）**：移动端 `.ant-message` 位于顶部 56px 导航栏下方且设置 `pointer-events: none`，避免遮挡左上角返回按钮。
- **Windows PowerShell 提示**：本地策略可能拦截 `npx.ps1`，请改用 `npx.cmd` 或 `npm run ...`；若 `rg` 不在 `PATH` 中，可使用 `git grep`。

## 5. 常用命令与验收基线

```bash
npm run dev           # 启动本地 Next.js 开发服务 (http://localhost:3000)
npm test              # 运行 AI SDK 冒烟测试 + 全部 Vitest 单元测试
npm run test:unit     # 仅运行 Vitest 单元测试 (tests/**/*.test.ts)
npm run test:ai-sdk   # 仅运行 Node AI SDK 冒烟测试
npx tsc --noEmit      # TypeScript 类型检查（Windows PowerShell 用 npx.cmd）
npm run lint          # ESLint 检查
npm run build         # Next.js 静态导出到 out/
npm run tauri build   # 编译 Windows 桌面端可执行文件 (.exe) 与安装包
```

- **任务完成后的 Windows `.exe` 构建验收与交付**：每次确认开发/修复任务完成且前置验收（`npm test`、`tsc --noEmit`、`npm run lint`、`npm run build`）通过后，执行 `npm run tauri build` 验证 Windows 桌面端编译打包无误，并在最终回复中给出最新生成的 `.exe` 路径（`src-tauri/target/release/read-bridge.exe` 及 `src-tauri/target/release/bundle/nsis/read-bridge_<version>_x64-setup.exe`）供用户直接测试。
- 修改 `src-tauri/` 下 Rust 代码时，在 `src-tauri/` 目录运行 `cargo check`。
- Android 初始化、JDK 17 / Android SDK / NDK 配置及 Edge-to-Edge 软键盘适配见 `docs/android-setup-guide.md`。
- 默认只做本地修改或按用户要求本地提交，未经明确要求不要 `git push`。
