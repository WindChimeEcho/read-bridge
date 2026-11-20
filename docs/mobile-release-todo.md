# 移动端（Android / iOS）云端构建与兼容性待办（TODO）

> 本文档记录 ReadBridge Android 与 iOS 端在 GitHub Actions 云端自动打包及上线前的待完成事项。当前版本优先保证桌面端（Windows / macOS / Linux）与 Web / H5 移动端体验，原生移动端打包将在后续版本按以下清单推进。

---

## 1. Android 云端构建（GitHub Actions `ubuntu-latest`）

### 1.1 签名密钥（Release Keystore）
Android 系统禁止安装完全未签名的 APK。为了让用户下载后可以直接安装，且后续版本可**无损覆盖升级（保留本地 IndexedDB 书架、阅读进度与缓存）**，建议使用免费自签 Keystore：

1. 本地使用 JDK `keytool` 生成 `.jks` 签名证书：
   ```bash
   keytool -genkeypair -v -keystore read-bridge-release.jks -alias readbridge -keyalg RSA -keysize 2048 -validity 10000
   ```
2. 在 Windows PowerShell 中转换为 Base64 字符串：
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("read-bridge-release.jks"))
   ```
3. 在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置 3 个 Secret：
   - `ANDROID_KEY_BASE64`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`（建议 `keypass` 与 `storepass` 保持一致，便于 `keystore.properties` 配置）

### 1.2 CI 构建步骤
- Runner：`ubuntu-latest`
- 基础环境：
  - Node.js `22`
  - JDK `17`（Temurin）
  - Android SDK / Build-Tools / NDK（使用 `android-actions/setup-android@v3`）
  - Rust target：优先 `aarch64-linux-android`（输出 `arm64-v8a` 单包以减小体积并加快编译）
- 工程初始化与补丁：
  - 在 CI 中执行 `npx tauri android init --ci`
  - 自动将 `docs/android-setup-guide.md` 第 3 节中的 Edge-to-Edge 软键盘安全区补丁写入 `src-tauri/gen/android/app/src/main/java/com/WindChimeEcho/readbridge/MainActivity.kt`
  - 根据 Secrets 写入 `src-tauri/gen/android/keystore.properties`
  - 执行 `npx tauri android build --ci --apk --target aarch64`
- Release 产物：
  - 仅上传 `read-bridge_<version>_android-arm64.apk`（不上传 `.aab`、x86 与 armv7 包）

---

## 2. iOS 云端构建（GitHub Actions `macos-latest`，无 Mac / 无开发者账号）

### 2.1 云端未签名 `.ipa` 构建方案
在没有 Mac 本地环境与付费 Apple Developer 账号时，可在 GitHub Actions `macos-latest` 上编译未签名 `.ipa`，并在 Release 说明中提示用户自行通过 **AltStore / SideStore / Sideloadly / TrollStore** 等工具重签安装：

1. 安装 Rust target：`aarch64-apple-ios`
2. 传入占位 `APPLE_DEVELOPMENT_TEAM` 环境变量执行 `npx tauri ios init --ci`（或非交互生成 `src-tauri/gen/apple` 工程）
3. 编译前端与 iOS Rust 静态库后，直接调用 `xcodebuild archive` 并显式禁用签名：
   ```bash
   xcodebuild archive \
     -project "src-tauri/gen/apple/read-bridge.xcodeproj" \
     -scheme "read-bridge_iOS" \
     -destination "generic/platform=iOS" \
     -archivePath "src-tauri/gen/apple/build/read-bridge.xcarchive" \
     -configuration Release \
     CODE_SIGNING_ALLOWED=NO \
     CODE_SIGNING_REQUIRED=NO \
     CODE_SIGN_IDENTITY=""
   ```
4. 将 `.xcarchive/Products/Applications/*.app` 放入 `Payload/` 目录并压缩打包为：
   - `read-bridge_<version>_ios-unsigned.ipa`（不上传 `.xcarchive`）

### 2.2 上线前必修代码适配项
当前代码尚未对 iOS 原生 WebView 容器做专项适配，构建 `.ipa` 前必须先完成以下修复：

1. **平台判断修正（`utils/platform.ts`）**
   - 现状：`isDesktopTauri()` 写为 `isTauri() && !isAndroid()`，会导致 iOS Tauri 运行时被误判为桌面端。
   - 待办：补充 `isIOS()`、`isTauriIOS()`，并在 `RuntimePlatform` 中新增 `'tauri-ios'`，确保 `isDesktopTauri()` 仅在桌面系统返回 `true`。
2. **文件导入/导出适配（`services/platform/fileAdapter.ts`）**
   - 现状：若走桌面端分支会调用 `@tauri-apps/plugin-dialog` 的 `save()`，而 iOS 沙盒不支持桌面式路径保存对话框，会导致 `.rbk` 备份导出失败。
   - 待办：为 `'tauri-ios'` 实现专用 `FileAdapter`（导入可复用 `<input type="file">` 或 `plugin-dialog` `open()`；导出改为 Web Blob 下载或写入应用沙盒目录后唤起系统分享面板）。
3. **iOS 朗读 / TTS 适配（`src-tauri/Cargo.toml`、`src-tauri/src/lib.rs`、`services/platform/ttsAdapter.ts`、`src-tauri/capabilities/mobile.json`）**
   - 现状：`tauri-plugin-tts` 当前仅在 `#[cfg(target_os = "android")]` 下编译初始化。
   - 待办：确认 iOS 首版走 WKWebView 内置 `window.speechSynthesis`，或将 `tauri-plugin-tts` 扩展至 `#[cfg(mobile)]`（底层调用 `AVSpeechSynthesizer`）并在真机验证后台音频与语音事件。
4. **Capabilities 权限核查（`src-tauri/capabilities/`）**
   - 检查 `default.json` 中的桌面窗口/Webview 权限（如 `core:webview:allow-webview-position`、`core:webview:allow-webview-size`）在 iOS / Android 构建和运行时的兼容性，必要时拆分为桌面端与移动端能力配置。
