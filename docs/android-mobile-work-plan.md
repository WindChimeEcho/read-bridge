# ReadBridge 安卓支持与双端视图重构工作文档

更新日期：2026-11-20  
状态：设计定稿，待阶段 1 实施  
前置基线：仓库源码审查、[docs/refactor-work-plan.md](file:///d:/Projects/read-bridge/docs/refactor-work-plan.md)、自动化验证环境核查及移动端全套视觉定稿确认。

---

## 1. 目标与执行原则

在保留 ReadBridge **纯网页端（Web）** 与 **Tauri 桌面端** 完整功能与交互体验的基础上，新增 **Tauri Android 移动端支持**，并建立一套可长期演进的 **“共享 Headless 业务层 + 双端独立视图层”** 架构，同时补齐无后端场景下的全量 / 单书本地备份导入导出能力（`.rbk`）。

- **渐进式可独立审查**：按阶段推进，每完成一个阶段均须独立通过 `npm test`、`npx tsc --noEmit`、`npm run lint` 与 `npm run build`（静态导出），禁止提交跨阶段大杂烩改动。
- **三端共存（Web 浏览器 + Tauri 桌面 + Tauri Android）**：所有 Tauri 原生插件均封装于 `services/platform/`，统一使用运行时环境检测与动态 `import()` 按需加载，保证纯网页端构建、SSR/静态导出与运行时零报错、零原生包体泄漏。
- **共享业务层 + 双端哑视图（Headless Hooks + Dumb Views）**：桌面端（`app/_views/desktop/`）与移动端（`app/_views/mobile/`）各自维护独立的交互组件；**严禁在任何视图组件内直接调用 `db`、`generateAnalysis`、`cacheService` 或 `EventEmitter`**，两端统一通过 `hooks/` 消费状态与动作，借助 TypeScript 强类型契约杜绝功能漂移。
- **数据向后兼容**：保持 IndexedDB 数据库 `book-reader`（`books`、`readingProgress` 表）与现有 Zustand `localStorage` 持久化键名不变；新增字段均提供安全默认值，不清空用户既有书籍、进度、书签、对话历史或模型密钥。
- **不把框架大版本升级混入业务重构**：Next.js 14、React 18、Ant Design 5、AI SDK 7.0.93 保持现状，仅在阶段 5 按需升级 Tauri v2 小版本以获得官方移动 API（如 `onBackButtonPress`）。

---

## 2. 已确认的产品与交互边界

| 编号 | 事项 | 已确认决定 |
| --- | --- | --- |
| 1 | **运行环境与同步边界** | 支持 Web 端（PC/手机浏览器）、Tauri 桌面端、Tauri Android 端；不做云端同步服务，跨设备迁移通过全量 / 单书 `.rbk` 备份包实现。 |
| 2 | **视图与能力双轨切换** | UI 视图按视口宽度切换（`< 768px` 渲染 `mobile`，`>= 768px` 渲染 `desktop`，支持浏览器调试与平板自适应）；原生能力按运行时（`isTauri` / `isAndroid`）自动分派。 |
| 3 | **三色阅读主题** | 支持 `Paper`（`#FAF8F5` 暖纸护眼）、`White`（`#FFFFFF` 纯白清爽）、`Dark`（`#16161A` 低眩光深色）三套阅读主题，双端共享。 |
| 4 | **阅读字号档位** | 维持 `小 (small) / 中 (medium) / 大 (large)` 三档，暂不扩展多级小数步进。 |
| 5 | **移动端书架页** | 砍掉底部导航 Tab 栏；顶栏左置 `Read Bridge` 品牌标识，右置 `[+ 导入]` 与 `[⚙️ 设置]`；上方保留紧凑「继续阅读」横幅卡片，下方为 3 列书封网格；单击进阅读，**长按书封**弹出底部操作面板（书籍详情 / 编辑信息与章节管理 / 导出单书备份 / 删除书籍）。 |
| 6 | **移动端阅读页顶栏** | 采用 **方案 A**：最左侧 `☰ 当前章节名`（点击拉开左侧抽屉），最右侧仅保留 `💬`（独立聊天入口），**顶栏不放返回箭头**；向下滚屏阅读时顶栏自动隐藏，轻滑回滚或轻触顶部区域浮现。 |
| 7 | **移动端正文与章末** | 移除桌面端句子左侧的 `Radio` 圆圈，改为整句点击柔和淡靛蓝高亮；每章末尾渲染 `[上一章] \| [目录] \| [下一章]` 快捷按钮，顺序读完可直接切章。 |
| 8 | **移动端左侧抽屉** | 80% 宽暖纸抽屉，严格继承初版设计：**保留顶部小书封缩略图 + 书名及作者/章进度副标题**；浅暖灰底槽 + 白色滑块 `目录 \| 书签`；无横线列表（选中章带左侧靛蓝竖条与淡紫圆角高亮）及书签摘录卡片；底部固定 `[小 \| 中 \| 大]`、`Paper / White / Dark` 三色圆点与全宽 `[返回书架]`；**实时字号预览例句平时隐藏，仅在点击切换 `小/中/大` 时短暂浮现，约 2.5~3 秒后或关闭抽屉时自动消失**。 |
| 9 | **移动端点击句子下弹层** | 两段式拖拽高度 Bottom Sheet（半屏 ~55% / 高屏 ~88%）；弹出时自动将选中原文句滚动至上半屏可见区防止遮挡；顶部展示原句（单词可点选跳转查词）+ `🔊 朗读` + `🔖 书签` + `💬 追问`；下方**严格只保留 `句子解析 \| 查词` 双 Tab**。 |
| 10 | **移动端独立聊天层** | 由阅读页顶栏 `💬` 或解析层 `💬 追问` 拉起高屏面板；统一承载历史会话、Prompt 选择器、`+ 新对话`、可移除的引用句上下文标签、思考过程折叠与流式 Markdown 输出。 |
| 11 | **移动端设置页** | 采用「一级分组菜单首页（AI 与模型 / 阅读与解析规则 / 通用与数据）→ 独立二级子页」；规则与章节拖拽排序统一绑定右侧独立 `≡` 拖拽手柄防止和页面滚动冲突；原桌面顶栏/底栏的低频项（自定义字体颜色、中英文切换、GitHub 链接）统一收入「外观与通用」子页。 |
| 12 | **TTS 朗读策略** | `system` 提供商按运行时分派：Web 与 Tauri 桌面端走 `window.speechSynthesis`，Tauri Android 端通过 `tauri-plugin-tts` 调用原生 `android.speech.tts.TextToSpeech`；在线云端 TTS 全端统一走 Web `fetch` + `Audio`。 |
| 13 | **AI 流式请求策略** | Android 端默认使用 WebView 原生 `fetch`，确保 Vercel AI SDK 的 SSE `ReadableStream` 打字机流式输出正常（规避 `@tauri-apps/plugin-http` 缓冲阻塞流问题）。 |
| 14 | **文件读写与备份载体** | 复用既有 `fflate` 读写 `.rbk`（ZIP 容器）；Web 端走 `<input type="file">` + `Blob` 下载，Tauri 桌面走 `plugin-dialog` + `plugin-fs`，Tauri Android 走 `tauri-plugin-android-fs` 处理 SAF `content://` URI（规避 `plugin-fs` 写 0 字节缺陷）。 |

---

## 3. 现有代码耦合审查与风险清单

通过逐文件审查现有源码，以下 9 处耦合与隐患必须在进入移动视图前或在对应阶段中彻底解决：

| 代码位置 | 现有问题与阻碍 | 重构 / 解决方案 |
| --- | --- | --- |
| `services/EventService.ts`<br>`app/components/sider/page.tsx` | 通过 `EventEmitter` 广播 `SEND_LINE_INDEX` / `SEND_MESSAGE`。桌面端右侧栏常驻挂载能收到事件，但移动端是点击句子后才按需弹出 Bottom Sheet，一次性事件必定丢失。 | 废除 `EventEmitter` 跨组件状态通信，新增显式 `useReaderSessionStore`（持久化/共享当前 `selectedLineIndex`、`selectedWord`、各弹层开关与引用句），两端同步订阅。 |
| `app/components/sider/components/SiderContent/index.tsx` | 333 行集成了句子解析、查词、`AbortController` 竞态取消、v2 缓存读写、自动 TTS、书签增删和规则解析逻辑，无法直接复用给移动端 Bottom Sheet。 | 拆分为 `hooks/useSentenceAnalysis.ts` 与 `hooks/useWordLookup.ts`，组件退化为纯粹布局与渲染。 |
| `app/components/sider/components/SiderChat/index.tsx` | 327 行将流式聊天、历史管理、Prompt 切换与桌面键盘全局快捷键（`Ctrl+Shift+A`、`Escape`）及 Antd `Modal` / `message` 混写在一起。 | 业务状态与流式生成逻辑拆至 `hooks/useChatSession.ts`；快捷键监听仅保留在桌面视图外壳中。 |
| `app/read/components/readArea/index.tsx` | 219 行将二分滚动位置防抖保存、恢复滚动、行 `Radio` 圆圈与行点击发射事件耦合在一起。 | 抽取 `hooks/useReadArea.ts`（含选中句自动滚动至上半屏可见区能力）；桌面保留原样式，移动端去掉 `Radio` 并使用整句高亮交互。 |
| `app/components/BookUploader/index.tsx`<br>`app/components/BookDetailsModal/index.tsx` | 导入逻辑深度绑定 Antd `UploadProps`（`beforeUpload` / `customRequest` / `onChange`）；书籍详情与编辑弹窗内直接调用 `db`、`router.refresh()` 与 `message`。 | 剥离 UI 包装，抽取 `hooks/useBookImport.ts`（入参为纯 `File[]`）与 `hooks/useBookManage.ts`（详情读取、元信息与章节保存、删除与单书导出）。 |
| `store/useSiderStore.ts`<br>`store/useStyleStore.ts` | `useSiderStore` 混放跨端 `readingId` 与桌面专属 `siderWidth`/`chatShortcut`；`useStyleStore` 中的 `itemsPerRow: 12`、`gutterX`/`gutterY` 被 `BookGrid` 直接用于 `24 / itemsPerRow`，会撑坏手机端栅格；且缺乏 `paper` 主题状态。 | 保留现有存储键名兼容老数据；在 `useStyleStore` 中补充 `readingTheme: 'paper' \| 'light' \| 'dark'` 与默认安全值；桌面列数配置仅作用于桌面书架组件。 |
| `utils/cache.ts`<br>`services/ServerUpload.ts` | 直接调用 `crypto.subtle.digest('SHA-256', bytes)`。在 `tauri android dev` 通过局域网 HTTP IP 真机调试时，WebView 处于非安全上下文，`crypto.subtle` 为 `undefined`，触发运行崩溃。 | 抽离共享 `utils/hash.ts`，优先使用 `globalThis.crypto?.subtle`，不可用时自动降级到轻量纯 JS SHA-256 实现，保证缓存键与导入书籍 `fileHash` 哈希结果完全一致。 |
| `types/cache.ts` | 句子分析引入前后文上下文（`contextBefore`/`contextAfter`）后，缓存键需区分上下文以避免同书不同处相同短句误命中；`.rbk` 备份确认不导出解析缓存。 | 在 `CacheKeyParams` 增加可选 `contextBefore?: string` 与 `contextAfter?: string`，不引入缓存导出负担。 |
| `services/ttsService.ts`<br>`services/Download.ts`<br>`app/api/tts/volcengine/route.ts` | `ttsService.ts` 内直接调用 Antd `message.error`；`Download.ts` 使用了 Node 专属 `fs`/`path`/`os` 模块；`app/api/tts/volcengine/route.ts` 与 `output: 'export'` 静态导出不兼容。 | `ttsService.ts` 接入 `notify` 与 `ttsAdapter`；文件保存迁移到 `services/platform/fileAdapter.ts`，清理无效 Node 导出路径与冲突 API 路由（火山等在线 TTS 改走纯前端配置或兼容接口）。 |

---

## 4. 目标四层架构与核心契约定义

### 4.1 目标目录结构树

```text
read-bridge/
├── utils/
│   ├── platform.ts                    # [新增] 运行时探测: isTauri / isAndroid / isDesktopTauri / isMobileWeb
│   ├── hash.ts                        # [新增] 共享 SHA-256（优先 crypto.subtle，非安全上下文纯 JS 降级）
│   └── cache.ts                       # [改造] 复用 utils/hash.ts 生成 v2 缓存键
├── services/
│   ├── platform/                      # [新增] 跨平台原生能力适配层（动态 import Tauri 插件）
│   │   ├── ttsAdapter.ts              #   system TTS 分派: Web/桌面 speechSynthesis vs Android tauri-plugin-tts
│   │   ├── fileAdapter.ts             #   文件选读与保存: Web Blob / 桌面 dialog+fs / Android android-fs
│   │   ├── backAdapter.ts             #   Android 物理/手势返回栈注册与分级消费
│   │   └── notify.ts                  #   统一提示适配（替代业务层直调 antd message）
│   ├── BackupService.ts               # [新增] 基于 fflate 的 .rbk 全量/单书打包、脱敏与冲突合并导入
│   └── DB.ts                          # [微调] 补充备份导出读取、近期阅读摘要与合并写入辅助方法
├── store/
│   ├── useReaderSessionStore.ts       # [新增] 跨端阅读会话与移动端弹层/临时字号预览状态机
│   ├── useStyleStore.ts               # [改造] 新增 readingTheme ('paper' | 'light' | 'dark') 及默认值
│   └── ...                            #   其余既有 Store 保持存储键名与数据结构向下兼容
├── hooks/                             # [核心] 双端共享 Headless 业务逻辑层
│   ├── useViewportMode.ts             #   基于 matchMedia ('(max-width: 767px)') 判定 'mobile' | 'desktop'
│   ├── useBookImport.ts               #   纯 File[] 格式校验、去重、数量限制、批量解析入库
│   ├── useBookManage.ts               #   书籍详情、编辑提交、章节管理、删除、单书导出触发
│   ├── useReadArea.ts                 #   章节句子读取、滚动进度防抖保存与恢复、选句防遮挡定位
│   ├── useChapterNav.ts               #   上一章 / 下一章 / 目录跳转 / 书签回跳与加载状态
│   ├── useSentenceAnalysis.ts         #   句子并发解析、AbortController 竞态、v2 缓存、自动 TTS、书签联动
│   ├── useWordLookup.ts               #   单词查词请求、竞态取消与单词发音
│   └── useChatSession.ts              #   流式对话、历史会话、Prompt 选择、接收「追问」引用句上下文
└── app/
    ├── _views/                        # [新增] 双端分离的纯视图层（禁止直接调 db / generateAnalysis / cache）
    │   ├── desktop/                   #   迁移现有桌面布局、Header/Footer、Sider、Dragger、Modal、设置页
    │   └── mobile/                    #   移动端全新 UI 实现
    │       ├── MobileShell.tsx        #     移动端根壳层（安全区 + 返回键栈消费 + 主题变量注入）
    │       ├── bookshelf/             #     无底栏书架页 + 继续阅读卡片 + 3 列封面 + 长按 ActionSheet + 详情/编辑子页
    │       ├── reader/                #     方案 A 顶栏(自动显隐) + 纯净阅读区 + 章末切章 + 带封面左抽屉 + 双 Tab 解析 Sheet + 独立 Chat Sheet
    │       └── setting/               #     分组设置首页 + 8 个独立二级子页（含外观与通用、数据导入导出）
    ├── components/common/             # [共用] MarkdownRenderer、ReasoningCollapse 等纯展示原子组件
    ├── home/page.tsx                  # 薄入口：按 useViewportMode 渲染 DesktopHome / MobileHome
    ├── read/page.tsx                  # 薄入口：按 useViewportMode 渲染 DesktopRead / MobileRead
    └── setting/page.tsx               # 薄入口：按 useViewportMode 渲染 DesktopSetting / MobileSetting
```

### 4.2 平台适配层接口定义

所有平台差异收敛在 `utils/platform.ts` 与 `services/platform/`，不向业务 Hook 或视图层暴露具体平台插件：

```typescript
// utils/platform.ts
export type RuntimePlatform = 'web' | 'tauri-desktop' | 'tauri-android';

export function isTauri(): boolean;
export function isAndroid(): boolean;
export function getRuntimePlatform(): RuntimePlatform;

// services/platform/ttsAdapter.ts
export interface SystemTTSDriver {
  isAvailable: () => Promise<boolean>;
  getVoices: () => Promise<Voice[]>;
  speak: (text: string, voiceType: string, speedRatio: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  getStatus: () => { isSpeaking: boolean; isPaused: boolean };
}

// services/platform/fileAdapter.ts
export interface PickFileOptions {
  extensions: string[];
  multiple?: boolean;
}

export interface SaveFileOptions {
  filename: string;
  data: Uint8Array;
  mimeType: string;
}

export interface FileAdapter {
  pickFiles: (options: PickFileOptions) => Promise<File[]>;
  saveBinaryFile: (options: SaveFileOptions) => Promise<{ saved: boolean; location?: string }>;
}

// services/platform/backAdapter.ts
export type BackHandler = () => boolean; // 返回 true 表示已消费本次返回事件，不再向下传递
export function registerBackHandler(priority: number, handler: BackHandler): () => void;
export function initBackButtonListener(): Promise<() => void>;

// services/platform/notify.ts
export interface NotifyAdapter {
  success: (content: string) => void;
  error: (content: string) => void;
  warning: (content: string) => void;
  info: (content: string) => void;
}
```

### 4.3 阅读会话 Store 契约（`useReaderSessionStore`）

替代 `EventService`，统一驱动桌面侧栏与移动端抽屉/Bottom Sheet 状态，同时承载左抽屉字号切换时的 **2.5~3 秒临时预览提示** 逻辑：

```typescript
// store/useReaderSessionStore.ts
export type MobileSheetType = 'none' | 'analysis' | 'chat';
export type AnalysisSheetTab = 'sentence' | 'word';
export type SheetDetent = 'peek' | 'expanded'; // ~55% 半屏 vs ~88% 高屏

interface ReaderSessionState {
  // 核心阅读选中态（桌面与移动共享）
  selectedLineIndex: number | null;
  selectedSentenceText: string;
  selectedWord: string;

  // 移动端阅读弹层与导航状态
  tocDrawerOpen: boolean;
  tocDrawerTab: 'toc' | 'bookmark';
  activeSheet: MobileSheetType;
  analysisTab: AnalysisSheetTab;
  sheetDetent: SheetDetent;

  // 独立聊天层引用上下文（点击「追问」时自动带入，可手动叉掉）
  chatQuotedSentence: string | null;

  // 左抽屉字号临时预览提示（仅切换 小/中/大 时短暂显示）
  fontPreviewVisible: boolean;
  fontPreviewTimerId: ReturnType<typeof setTimeout> | null;

  // 动作
  selectSentence: (lineIndex: number, text: string, openSheet?: boolean) => void;
  selectWordInSentence: (word: string) => void;
  openTocDrawer: (tab?: 'toc' | 'bookmark') => void;
  closeTocDrawer: () => void;           // 关闭时同步清除 fontPreviewVisible 与计时器
  openChatSheet: (quotedSentence?: string | null) => void;
  clearChatQuote: () => void;
  closeActiveSheet: () => void;
  setSheetDetent: (detent: SheetDetent) => void;
  setAnalysisTab: (tab: AnalysisSheetTab) => void;
  triggerFontPreview: (durationMs?: number) => void; // 默认 2800ms，重复点击重置计时器
  hideFontPreview: () => void;
  resetSession: () => void;             // 切书或退出阅读页时重置
}
```

### 4.4 Headless Hooks 清单与职责边界表

| Hook 名称 | 核心输入 | 输出状态 (`state`) | 对外动作 (`actions`) | 双端差异点（仅在视图层体现） |
| --- | --- | --- | --- | --- |
| `useViewportMode` | 无 | `mode: 'desktop' \| 'mobile'`、`mounted` | 无 | 作为各路由与 Shell 的渲染分发开关。 |
| `useBookImport` | 无 | `isImporting`、`progress` (`total/done/failed`) | `importFiles(files: File[])`、`pickAndImport()` | 桌面接 Antd `Upload.Dragger`；手机点 `+` 调 `pickAndImport()`。 |
| `useBookManage` | `bookId` | `book`、`loading`、`saving` | `saveBookChanges(updated)`、`deleteBook()`、`exportSingleBook()` | 桌面在 `BookDetailsModal` 中操作；手机由长按 `ActionSheet` 跳转独立详情/编辑页。 |
| `useReadArea` | `book`、`readingProgress` | `title`、`lines`、`selectedLineIndex` | `onSelectSentence(idx, text)`、`saveScrollLine(idx)`、`scrollLineIntoSafeArea(idx)` | 桌面保留 `Radio`；手机去掉 `Radio`，且弹 Sheet 时将选中句滚至上半屏可见区。 |
| `useChapterNav` | `book`、`currentChapter` | `isChapterLoading`、`hasPrev`、`hasNext`、`bookmarks` | `goToChapter(idx, lineIdx?)`、`prevChapter()`、`nextChapter()`、`jumpToBookmark(bm)`、`deleteBookmark(id)` | 桌面放在左侧可折叠目录条；手机放在 80% 左抽屉及章末三按钮。 |
| `useSentenceAnalysis` | `bookId`、`sentence`、`chapterIndex`、`lineIndex` | `analyses`、`isBookmarked`、`isPlayingTTS`、`canRun` | `retryRule(id)`、`toggleBookmark()`、`speakSentence()`、`stopTTS()` | 桌面常驻 `SiderContent` 展示；手机渲染在半屏 Bottom Sheet「句子解析」Tab。 |
| `useWordLookup` | `bookId`、`sentence`、`word` | `wordDetails`、`wordReasoning`、`loading`、`error` | `lookupWord(word)`、`speakWord(word)`、`clearWord()` | 桌面展现在原句下方卡片；手机切到「查词」Tab 独立展示。 |
| `useChatSession` | `bookId`、`readingProgress`、`quotedSentence` | `history`、`historyList`、`isGenerating`、`selectedPromptId` | `sendMessage(text)`、`stopGeneration()`、`newChat()`、`selectHistory(id)`、`deleteHistory(id)`、`changePrompt(id)` | 桌面保留 `Ctrl+Shift+A` / `Escape`；手机通过高屏 Chat Sheet 展示并带可关闭引用胶囊。 |

### 4.5 三色主题 Token 映射表

在 [store/useStyleStore.ts](file:///d:/Projects/read-bridge/store/useStyleStore.ts) 新增 `readingTheme: 'paper' | 'light' | 'dark'`（初始默认桌面端沿用 `light` 或跟随系统、移动端默认 `paper` 暖纸，且兼容原有 `lightModeTextColor` / `darkModeTextColor` 自定义字体色覆盖）：

| 语义 Token | `paper`（暖纸护眼） | `light`（纯白清爽） | `dark`（夜间深色） | 说明 |
| --- | --- | --- | --- | --- |
| `--rb-bg-canvas` | `#FAF8F5` | `#FFFFFF` | `#16161A` | 阅读正文与抽屉主底色 |
| `--rb-bg-surface` | `#FFFFFF` | `#FFFFFF` | `#202026` | 弹层、卡片、设置分组底色 |
| `--rb-bg-muted` | `#EFECE6` | `#F3F4F6` | `#2A2A32` | 分段底槽、次级暖灰按钮 (`#EAE7E1`/`#EFECE6`) |
| `--rb-text-primary` | `#26231F` *(或自定义亮色文字)* | `#18181B` *(或自定义亮色文字)* | `#D4D4D8` *(或自定义暗色文字)* | 正文主文字色 |
| `--rb-text-secondary` | `#716B62` | `#71717A` | `#9CA3AF` | 副标题、章节进度、辅助信息 |
| `--rb-accent` | `#4F46E5` | `#4F46E5` | `#6366F1` | 靛蓝强调色（竖条、下划线、主按钮） |
| `--rb-highlight-bg` | `#EEF0FF` | `#EEF2FF` | `#26294A` | 当前选中句子、选中章节柔和底色 |
| `--rb-border` | `#E6E1D6` | `#E5E7EB` | `#2E2E38` | 极细分割线与卡片边框 |

> [!NOTE]
> `paper` 与 `light` 均映射至 Ant Design 的 `theme.defaultAlgorithm`，`dark` 映射至 `theme.darkAlgorithm`，确保仍复用的 Antd 表单组件与系统主题色无缝联动。

### 4.6 `.rbk` 备份包格式规范

基于既有 `fflate` 生成标准 ZIP 归档（扩展名 `.rbk`，导出时提示用户保存；导入时按魔数校验为有效 ZIP 且包含 `manifest.json`）：

```text
backup-YYYYMMDD-HHmmss.rbk (ZIP)
├── manifest.json       # { formatVersion: 1, appVersion, exportType: 'full' | 'book', exportedAt, includeApiKeys: boolean, bookIds: string[] }
├── books/
│   └── <bookId>.json   # 完整 Book 对象（含封面 base64 资源与 chapterList）
├── progress.json       # ReadingProgress[]（全量为全部书籍；单书仅含该 bookId 记录）
├── bookmarks.json      # Record<bookId, Bookmark[]>
├── history.json        # LLMHistory[]（仅全量备份包含）
└── settings.json       # 仅全量备份包含：llmProviders(当 includeApiKeys=false 时置空 apiKey 字段)、outputOptions、styleSettings、ttsConfig(脱敏 token/appid)
```

- **单书导出**：打包 `books/<id>.json` + 该书 `progress` + 该书 `bookmarks`（不导出分析缓存）。
- **导入冲突策略**：
  - 按 `book.fileHash` 与 `book.id` 识别重复书籍；
  - `skip`（默认）：跳过已存在书籍，但增量合并尚未存在的书签；
  - `overwrite`：覆盖该书数据与阅读进度，并合并书签与（全量恢复时的）配置项；当全量包 `includeApiKeys === false` 时，保留本地已填密钥不被空字符串覆盖。

---

## 5. 分阶段实施计划与验收标准

### 阶段 1：底层排雷、三色主题升级与 Headless Hooks 抽离（桌面端零视觉回归）

**变更范围**：底层工具、平台适配边界、Store 扩展、全部核心业务 Hooks；现有桌面组件切换为消费新 Hooks（不改桌面外观与交互逻辑）。

**具体任务**：
1. 新建 `utils/platform.ts`、`utils/hash.ts`、`services/platform/notify.ts`；在 [utils/cache.ts](file:///d:/Projects/read-bridge/utils/cache.ts) 与 [services/ServerUpload.ts](file:///d:/Projects/read-bridge/services/ServerUpload.ts) 统一接入 `utils/hash.ts` 纯 JS SHA-256 兜底；在 [types/cache.ts](file:///d:/Projects/read-bridge/types/cache.ts) 补全可选上下文入参 `contextBefore`/`contextAfter`。
2. 扩展 [store/useStyleStore.ts](file:///d:/Projects/read-bridge/store/useStyleStore.ts) 与 [app/components/layout/theme-provider.tsx](file:///d:/Projects/read-bridge/app/components/layout/theme-provider.tsx)，加入 `paper / light / dark` 三色主题支持与 CSS 变量注入。
3. 新建 `store/useReaderSessionStore.ts`，删除 [services/EventService.ts](file:///d:/Projects/read-bridge/services/EventService.ts) 的全部调用点（[Sider](file:///d:/Projects/read-bridge/app/components/sider/page.tsx)、[ReadArea](file:///d:/Projects/read-bridge/app/read/components/readArea/index.tsx)、[SiderContent](file:///d:/Projects/read-bridge/app/components/sider/components/SiderContent/index.tsx)）。
4. 抽离并实现 8 个核心 Hooks：`useViewportMode`、`useBookImport`、`useBookManage`、`useReadArea`、`useChapterNav`、`useSentenceAnalysis`、`useWordLookup`、`useChatSession`。
5. 改写桌面端业务组件为仅调用上述 Hooks（桌面键盘快捷键留于桌面聊天外壳内）。

**删除/替换项**：清空并移除对 `services/EventService.ts` 的业务依赖。

**验收标准**：
- `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run build` 全部通过；
- 为新抽离的核心 Hooks 与 SHA-256 兜底逻辑补全 `vitest` 单元测试（覆盖选句并发取消、切书重置、字号预览计时销毁、非安全上下文 SHA-256）；
- 桌面端所有已有交互与页面布局零回归。

---

### 阶段 2：双端视图分发骨架与移动端核心阅读闭环

**变更范围**：根布局视口/安全区配置、`app/_views/desktop/` 整理迁移、`app/_views/mobile/` 书架与阅读核心闭环上线。

**具体任务**：
1. 更新 [app/layout.tsx](file:///d:/Projects/read-bridge/app/layout.tsx)（补充 `viewport-fit=cover`、`100dvh` 动态高度与安全区 CSS）及 [structure-layout.tsx](file:///d:/Projects/read-bridge/app/components/layout/structure-layout.tsx)，基于 `useViewportMode` 分发 `DesktopShell` 与 `MobileShell`。
2. 将当前桌面页面及专属组件整理至 `app/_views/desktop/`，保持共用纯净展示组件在 `app/components/common/`。
3. 落地 **移动端书架页（`MobileBookshelf`）**：无底栏极简顶栏（`+ 导入`、`⚙️ 设置`）、顶部「继续阅读」横幅卡片、3 列书封网格、**长按书封触发底部操作面板**（书籍详情页、带 `≡` 拖拽手柄的章节管理编辑页 `MobileBookEditor`、删除确认）。
4. 落地 **移动端阅读页（`MobileReader`）**：
   - **方案 A 顶栏**：最左 `☰ 章节名`、最右 `💬`（无返回箭头），下滑自动隐藏，回滑/轻触顶部浮现；
   - **正文区**：无 `Radio` 整句点击淡靛蓝高亮，底部章末呈现 `[上一章] \| [目录] \| [下一章]`；
   - **80% 左侧暖纸抽屉**：保留顶部小书封+书名副标题、浅暖灰底槽白滑块 `目录 \| 书签`、无横线章节与书签卡片列表、底部 `[小 \| 中 \| 大]` + `Paper / White / Dark` 三色圆点 + `返回书架`；点击切换字号时在滑块附近浮现一行实时预览例句，**2.8 秒后或关闭抽屉立即消失**。
   - **点击句子 Bottom Sheet**：两段式拖拽（55% / 88%），弹起时自动将选中句滚入上半屏可见区；原句支持点词高亮跳转；右上集成 `🔊` `🔖` `💬 追问`；严格双 Tab `句子解析 \| 查词`。
   - **独立直接聊天 Sheet**：高屏层，整合历史会话、Prompt 选择器、`+ 新对话`、可关闭引用句标签、`ReasoningCollapse` 与 Markdown 流式响应。

**验收标准**：
- 在浏览器移动端仿真与真机浏览器中跑通完整闭环：书架导入书籍 → 阅读 → 滚屏顶栏自动收起 → 左抽屉切章与管理书签 → 切换 `小/中/大` 字号触发临时预览并在关闭或超时后消失 → 切换 `Paper / White / Dark` 三色主题 → 点句弹出解析层与点词查词 → 点击「追问」或顶栏 `💬` 进行多轮流式对话；
- 视口由桌面拖拽到移动端宽度时，保持阅读书籍、选中句子与会话状态不断裂；
- `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run build` 全绿。

---

### 阶段 3：移动端二级分组设置页与「外观与通用」补齐

**变更范围**：移动端设置首页与全部 8 个二级子页面、移动端主题/字体颜色与语言配置闭环。

**具体任务**：
1. 实现移动端设置分组首页（`AI 与模型` / `阅读与解析规则` / `通用与数据`）及单页内子视图路由/返回栈支持。
2. 落地移动端 6 个既有设置子页视图（共享底层 Store 与校验规则）：
   - `AI 服务商与密钥`（横向服务商胶囊 + 表单 + 模型增删改）；
   - `默认模型与思考配置`（解析模型 / 对话模型及思考模式开关与档位）；
   - `对话 Prompt 管理`、`句子解析规则`、`查词规则`（统一使用右侧 `≡` 手柄触发拖拽排序，避免上下滚屏冲突）；
   - `语音朗读 (TTS)`（自动朗读开关、环境感知提示、发音人/语速滑块与试听）。
3. 新增「外观与通用」子页：承接原桌面顶栏/底栏内的**自定义亮/暗文字颜色选择器、界面中英文切换、GitHub 项目入口**。

**验收标准**：
- 桌面端与移动端设置项能力 100% 对等，修改任意模型、规则、语言或颜色配置后两端立即生效且共享同一持久化存储；
- 手机触屏拖动规则列表不会与页面垂直滚动打架。

---

### 阶段 4：`.rbk` 全量与单书导入导出备份系统

**变更范围**：`services/BackupService.ts`、`services/platform/fileAdapter.ts`（Web 与桌面端先就位）、双端导入导出入口 UI。

**具体任务**：
1. 实现 `services/BackupService.ts`：基于 `fflate`（`zipSync` / `unzipSync`）实现全量导出（含 `includeApiKeys` 脱敏开关）、单书导出（附带该书关联进度/书签）以及导入前摘要校验与冲突策略合并（`skip` / `overwrite`）。
2. 在阶段 1 预留的 `fileAdapter.ts` 中落地 Web 端（`<input type="file">` + `Blob` 下载）实现，并清理不再使用的 Node 专属 `services/Download.ts`。
3. 接入移动端「数据导入与导出」设置子页与长按书籍菜单「导出单书备份」，同时在桌面端设置页与 `BookDetailsModal` 补充对应导入导出按钮。

**验收标准**：
- 编写针对 `BackupService` 的 `vitest` 单元测试：覆盖全量/单书打包解包、`includeApiKeys: false` 密钥脱敏校验、`skip` 与 `overwrite` 冲突合并、损坏包报错兜底；
- 端到端验证：在一端导入书并添加书签与阅读进度 → 导出单书或全量 `.rbk` → 清空环境或另一浏览器导入 → 打开对应书籍时进度与书签完整恢复。

---

### 阶段 5：Tauri v2 升级与 Android 原生工程打通

**变更范围**：Rust/Cargo 与 NPM Tauri 依赖升级、`tauri android init`、Android 原生插件与权限配置、`MainActivity.kt` 适配、`fileAdapter`/`ttsAdapter`/`backAdapter` Android 实现落地。

**具体任务**：
1. 将 [src-tauri/Cargo.toml](file:///d:/Projects/read-bridge/src-tauri/Cargo.toml) 与 [package.json](file:///d:/Projects/read-bridge/package.json) 中的 Tauri 依赖升级至最新 `2.9.x`（同步引入 `@tauri-apps/api`、`@tauri-apps/plugin-dialog`、`@tauri-apps/plugin-fs`、`tauri-plugin-tts-api` 与 `tauri-plugin-android-fs` 相关绑定）；在 [src-tauri/src/lib.rs](file:///d:/Projects/read-bridge/src-tauri/src/lib.rs) 按平台条件注册对应插件（确保桌面/移动端均可编译），并配置 `src-tauri/capabilities/default.json` 权限（含 `tts:allow-register-listener`）。
2. 执行 `npx tauri android init` 生成 `src-tauri/gen/android` 工程，在 `MainActivity.kt` 中配置 `ViewCompat.setOnApplyWindowInsetsListener`，使用 `maxOf(systemBars.bottom, ime.bottom)` 解决 Android Edge-to-Edge 软键盘遮挡聊天输入框问题。
3. 在 `services/platform/backAdapter.ts` 接入 `@tauri-apps/api/app` 的 `onBackButtonPress`，建立 4 级消费优先级：**关闭最顶层弹窗 / 聊天层 / 解析层 / 左抽屉 → 退出设置二级子页或编辑页 → 阅读页退回书架 → 书架页退出/转后台**。
4. 在 `services/platform/ttsAdapter.ts` 接入 `tauri-plugin-tts`（Android）+ Web Speech（Web/桌面）；在 `services/platform/fileAdapter.ts` 接入 `tauri-plugin-android-fs`（Android SAF `content://` 读写）+ `plugin-dialog/fs`（桌面）；删除无法在静态导出中执行的 `app/api/tts/volcengine/route.ts` 占位动态路由（如需线上 TTS 另建纯前端或标准 OpenAI Audio 接口）。
5. 清理桌面/真机连调中遇到的 Android 网络明文/CORS 问题（确保优先走 WebView 原生 `fetch` 保住 SSE 流式打字机体验），验证 Debug 与签名 Release APK 打包流程。

**验收标准**：
- Android 真机或模拟器成功安装运行 APK；
- 物理/全面屏侧滑返回按 4 级优先级逐层收起界面，不误退 App；
- 软键盘弹起时独立聊天框正常顶起且不遮挡输入；
- 真机验证：EPUB/TXT/MD 文件选择导入、Android 原生 TTS 朗读句子/单词、AI 流式解析与对话、`.rbk` 全量与单书导出/导入均实测可用，同时网页端 `npm run build` 依然 100% 正常通过。

---

## 6. 本机环境现状与外部依赖说明

经核查当前工作区运行环境：

- **已就绪（可直接推进阶段 1 — 阶段 4 全部编码与验收）**：
  - Node.js >= 22、TypeScript 5、Vitest 5、Next.js 14.2.35 静态构建；
  - Rust / Cargo 工具链（`rustc.exe`、`cargo.exe` 已安装于 `C:\Users\Administrator\.cargo\bin\`）。
- **进入阶段 5 前需补充的外部依赖**：
  - 本机当前未检测到 Android SDK（`ANDROID_HOME` 环境变量为空，`%LOCALAPPDATA%\Android\Sdk` 不存在）。
  - 执行 `npx tauri android init` 与 APK 构建前，需安装 Android Studio（或命令行 SDK Manager），配齐 Android SDK Platform（API 34/35）、Android SDK Build-Tools、NDK（r26+）及 JDK 17，并配置好 `ANDROID_HOME`、`NDK_HOME` 与 `JAVA_HOME`，同时使用 `rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android` 添加交叉编译目标。

---

## 7. 必须覆盖的回归测试矩阵

除现有 `npm test`（AI SDK 契约、provider 工厂、v2 缓存、导入与分句）继续保持全绿外，重构期间新增自动化与人工回归必须覆盖：

- **并发与状态一致性**：快速连续点击多句、切词、新建对话或切换历史时，旧 `AbortController` 请求不得写入新界面或污染缓存；`useReaderSessionStore` 在切书或退出阅读页时干净复位。
- **字号临时预览计时器**：连续点击切换 `小/中/大` 时重置 2.8 秒定时器，不提前闪退；提前关闭左抽屉时立刻清理定时器与预览状态。
- **视口断点切换**：桌面与移动端切换宽度时，书籍、进度、书签、缓存与配置保持零丢失。
- **缓存与上下文一致性**：同书不同处相同短句（含不同 `contextBefore` / `contextAfter`）不会互相误命中缓存；非安全上下文降级 SHA-256 与原生 `crypto.subtle` 哈希一致。
- **备份安全与合并**：`includeApiKeys: false` 时 `settings.json` 不含明文密钥与敏感 token；导入遇到重复书时 `skip` 不覆盖原进度但合并增量书签，`overwrite` 正确刷新目标书籍与进度；非法 ZIP 或缺失 `manifest.json` 时明确报错而不损坏现有数据。
- **Android 原生专项（阶段 5）**：4 级返回键逐层拦截顺序、软键盘与安全区避让、`tauri-plugin-tts` 生命周期回调、Android SAF `content://` 大文件（带图片 EPUB / `.rbk`）非零字节完整写入与读取、Web 浏览器静态包零运行时报错。

---

## 8. 阶段审查交付模板与视觉定稿参考

每阶段完成后，交付审阅摘要固定包含：
1. **问题与行为变化**：用户及多端实际可见的前后差异。
2. **模块与删除边界**：新增/改造了哪些文件，彻底删除了哪些旧耦合路径。
3. **数据影响**：是否新增存储字段或迁移策略，如何保证老数据安全。
4. **验证证据**：实跑 `npm test`、`npx tsc --noEmit`、`npm run lint`、`npm run build` 及真机/模拟器实测结果（无条件验证的外部项必须明确单列）。

### 移动端视觉定稿参考（已出图确认）

- 完整视觉画廊：[mobile_ui_full_gallery.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/7c7c6535-027c-47a1-a1c2-16642ead3c55/mobile_ui_full_gallery.md)
- 方案比选汇总：[mobile_ui_variants.md](file:///C:/Users/Administrator/.gemini/antigravity/brain/7c7c6535-027c-47a1-a1c2-16642ead3c55/mobile_ui_variants.md)
