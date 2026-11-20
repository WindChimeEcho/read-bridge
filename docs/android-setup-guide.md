# ReadBridge Tauri Android 打包与真机调试指南

> 本文档对应工作计划阶段 5 的外部工具链初始化、Android Edge-to-Edge 软键盘安全区修补（`MainActivity.kt`）以及 APK 构建说明。前端与 Rust 插件层代码已完成就绪，在本机补齐 JDK 17 与 Android SDK / NDK 后即可直接执行下列命令出包。

---

## 1. 必备环境与环境变量

当前开发机已内置 Rust (`rustc` / `cargo`) 与 Node.js (`>= 22`)，生成 Android 工程与打包 APK 前请确认以下依赖就位：

1. **JDK 17**（推荐使用 Microsoft OpenJDK 17 或 Eclipse Temurin 17）
2. **Android Studio / Command-line SDK Manager**，安装：
   - Android SDK Platform 34 或 35
   - Android SDK Build-Tools 34.x / 35.x
   - Android NDK (Side by side) r26+
3. **环境变量（Windows PowerShell 示例）**：

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\26.3.11579264"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
```

4. **添加 Rust Android 交叉编译目标**：

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

---

## 2. 初始化 Tauri Android 原生工程

在仓库根目录运行：

```powershell
npx tauri android init
```

该命令会生成 `src-tauri/gen/android/` 目录及 Gradle / Kotlin 原生工程。

---

## 3. 修补 `MainActivity.kt` 解决软键盘遮挡（Edge-to-Edge IME Insets）

Android 15+ 默认启用 Edge-to-Edge；在聊天 Sheet 与书籍/规则编辑页弹出软键盘时，须将底部 WindowInsets 设为 `maxOf(systemBars.bottom, ime.bottom)`。

打开生成的 `src-tauri/gen/android/app/src/main/java/com/WindChimeEcho/readbridge/MainActivity.kt`，将其更新为：

```kotlin
package com.WindChimeEcho.readbridge

import android.os.Bundle
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val rootView = window.decorView.findViewById<android.view.View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(rootView) { view, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
      view.setPadding(
        systemBars.left,
        systemBars.top,
        systemBars.right,
        maxOf(systemBars.bottom, ime.bottom)
      )
      insets
    }
  }
}
```

---

## 4. 真机调试与 APK 构建命令

- **局域网热重载真机调试**（非安全 HTTP Context 下已通过 `utils/hash.ts` 纯 JS SHA-256 兼容）：

```powershell
npx tauri android dev
```

- **构建通用 APK**：

```powershell
npx tauri android build --apk
```

生成的 APK 位于 `src-tauri/gen/android/app/build/outputs/apk/universal/`。

---

## 5. 真机 / 模拟器验收清单

- **4 级物理/手势返回键优先级**：
  1. 关闭最顶层弹窗（规则/模型编辑 Modal、ActionSheet、分析 Layer 80 / 聊天 Layer 85 / 左侧抽屉 Layer 70）；
  2. 退出设置二级子页（Layer 50）或书籍编辑页（Layer 65）；
  3. 阅读页或设置首页返回书架（Layer 10）；
  4. 书架首页触发退出应用（`exit(0)`）。
- **Android 原生 TTS (`tauri-plugin-tts`)**：冷启动自动轮询 `isInitialized()` 并拉取系统语音列表；句子/单词朗读与停止状态同步正常。
- **Android SAF (`tauri-plugin-android-fs`)**：导入含图 `.epub` / `.txt` / `.md` 书籍，以及导出/导入全量或单书 `.rbk` 备份包均为完整非零字节读写。
- **AI SSE 流式输出**：直接使用 WebView 原生 `fetch`，确保流式打字机逐字显示正常。
