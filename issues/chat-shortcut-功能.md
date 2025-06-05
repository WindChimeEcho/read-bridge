# Chat快捷键功能实现

## 任务描述
为SiderChat组件的按钮添加可配置的快捷键功能，实现"chat with ai"功能的快速访问。

## 技术方案
- 使用zustand store存储快捷键配置
- 在组件内实现键盘事件监听
- 支持Ctrl/Alt/Shift组合键

## 实现详情

### 1. Store扩展 (`store/useSiderStore.ts`)
- 添加`chatShortcut: string`字段
- 添加`setChatShortcut`方法
- 默认值设为'Ctrl+K'

### 2. 组件修改 (`app/components/sider/components/SiderChat/index.tsx`)
- 导入useSiderStore
- 添加useEffect监听键盘事件
- 实现快捷键解析和匹配逻辑
- 触发handleOpenModal打开聊天对话框

## 功能特性
- ✅ 快捷键持久化存储
- ✅ 支持组合键(Ctrl+K)
- ✅ 事件冲突预防(preventDefault)
- ✅ 组件卸载时清理监听器
- 🔄 快捷键修改功能(待后续实现)

## 默认配置
- 默认快捷键: `Ctrl+K`
- 存储位置: zustand persist store
- 触发行为: 打开聊天对话框 