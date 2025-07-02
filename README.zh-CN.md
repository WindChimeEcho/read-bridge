# ReadBridge: AI增强型语言学习阅读助手

*[English](./README.md) | [中文](./README.zh-CN.md)*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/) [![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white)](https://tauri.app/) [![Web](https://img.shields.io/badge/-Web-blue)](https://nextjs.org/) [![Windows](https://img.shields.io/badge/平台-Windows-blue?logo=windows&logoColor=white)](https://tauri.app/) [![macOS](https://img.shields.io/badge/平台-macOS-blue?logo=apple&logoColor=white)](https://tauri.app/) [![Linux](https://img.shields.io/badge/平台-Linux-blue?logo=linux&logoColor=white)](https://tauri.app/)

[![文档](https://img.shields.io/badge/文档-docs.readbridge.cc-blue)](https://docs.readbridge.cc/)

ReadBridge是一款AI驱动的阅读助手，同时提供网页应用和桌面软件（通过Tauri）。它通过"n+1"可理解输入方法辅助语言学习，帮助学习者更有效地阅读目标语言内容。

## 概述

这款阅读助手实现了源语言到源语言的学习方法，减少对母语翻译的依赖。该平台帮助学习者在目标语言生态系统中练习阅读，通过上下文理解促进自然语言习得。

## 可理解输入理论

ReadBridge基于Stephen Krashen的可理解输入假说，该理论认为：

- **自然习得**：当我们在上下文中理解信息时，我们能自然习得语言
- **输入水平**：当输入略高于当前能力水平时，学习最为有效
- **意义优先**：理解内容的意义优先于显式学习语法规则

## 项目起源

ReadBridge的灵感来自我在一次刷视频时的偶然发现，这个视频彻底改变了我对语言学习的理解。视频中讲述了语言学习的三大难题：

- 任意符号难题：记单词就像记住无意义的符号，这种记忆容易遗忘
- 宽度难题：单词量如海洋般广阔，单纯背诵就像用木桶舀海水
- 深度难题：词义深度如井水，单纯记忆只能触及表面

让我印象深刻的是："每百词中只有1-2个生词"的可理解输入理念，以及"一个单词需要在不同语境中重复至少12次"才能真正掌握。这让我意识到，在语境中学习词汇就像解谜一样自然而有效。

视频还介绍了匈牙利语言学家Lomb Kato通过阅读原著掌握了15门语言的故事，以及Sidney Sheldon的十本小说能覆盖六级词汇90%以上，平均每个词重复26次的研究发现。研究表明，日常阅读可能是我们获取大部分词汇量的主要来源，每天只需半小时，一年就能完成100万词的阅读量。

"只有这一种阅读，才是真正的阅读"——这句话成为了我开发ReadBridge的动力。如果你也对这种学习方法感兴趣，推荐看看这个视频：https://www.bilibili.com/festival/jzj2023?bvid=BV1ns4y1A7fj

## 主要特点

- **交互式阅读界面**：通过直观的UI逐句阅读文本
- **AI阅读支持**：获取目标语言的解释，保持语言沉浸
- **用户自定义难度**：根据自我评估的熟练程度设置提示词模板
- **上下文学习**：在真实语境中探索词汇和语法结构
- **进度跟踪**：保存各章节和书籍中的阅读位置
- **自定义配置**：调整设置以匹配你的学习偏好
- **跨平台**：在任何现代浏览器或作为桌面应用使用
- **书籍管理**：轻松导入、组织和访问阅读材料
- **无干扰设计**：简洁界面设计，专注于阅读体验

## 开始使用

### 网页版

1. 克隆仓库
   ```bash
   git clone https://github.com/WindChimeEcho/read-bridge.git
   cd read-bridge
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

### 桌面版 (Tauri)

1. 按照 [Tauri v2 设置指南](https://v2.tauri.app/guides/quick-start/prerequisites) 安装先决条件
   
2. 安装依赖并构建应用
   ```bash
   npm run tauri dev
   ```

## 下载

您可以从GitHub发布页面下载ReadBridge的最新版本：

- [所有版本](https://github.com/WindChimeEcho/read-bridge/releases)

## 部署

只需一键部署您自己的ReadBridge实例：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/WindChimeEcho/read-bridge)

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/部署到-Cloudflare%20Pages-orange.svg?style=for-the-badge&logo=cloudflare)](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nextjs-site/)

## 配置

ReadBridge提供多种配置选项：

### AI设置
- 配置不同的AI提供商（OpenAI等）
- 设置自定义模型和端点
- 管理API密钥和访问权限
- **隐私说明**：我们不会保存您的API密钥 - 所有API密钥均存储在您浏览器的本地存储中，确保数据安全

### 模型配置
- 为不同功能选择默认模型
- 自定义模型参数

### 提示词配置
- 从预设提示词模板中选择或创建自己的模板
- 根据您的语言水平和学习目标自定义提示词
- 调整阅读过程中获取的辅助类型

### 句子处理
- 配置文本如何分段和呈现
- 调整阅读流程以匹配您的偏好

## AI如何增强阅读体验

ReadBridge有针对性地利用AI支持您的阅读：

- **上下文解释**：获取目标语言中关于难点段落的说明
- **词汇支持**：通过解释而非直接翻译理解新词
- **定制化辅助**：接收根据您自选熟练度水平调整的帮助
- **自然语言交互**：提问以深化对文本的理解

## 学习方法

ReadBridge通过以下方式支持语言习得：

- **沉浸式阅读**：接触目标语言的真实文本
- **上下文理解**：通过语境而非孤立学习新元素
- **个性化支持**：根据您当前能力配置AI辅助
- **阅读流畅性**：通过无干扰界面保持专注

## 贡献

欢迎贡献！请随时提交PR。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
