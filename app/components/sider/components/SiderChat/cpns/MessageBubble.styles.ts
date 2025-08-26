import { CSSProperties } from 'react';

// Solarized 配色方案
export const solarizedColors = {
  // 单调色
  base03: '#002b36', // 最深背景
  base02: '#073642', // 深色强调背景  
  base01: '#586e75', // 内容文本(深色模式)
  base00: '#657b83', // 主要文本
  base0: '#839496',  // 主要文本(浅色模式)
  base1: '#93a1a1',  // 强调文本
  base2: '#eee8d5',  // 浅色强调背景
  base3: '#fdf6e3',  // 最浅背景

  // 强调色
  blue: '#268bd2',    // 用户消息
  cyan: '#2aa198',    // 链接/操作
  green: '#859900',   // 成功状态
  yellow: '#b58900',  // 警告/思考中
  orange: '#cb4b16',  // 橙色强调
  red: '#dc322f',     // 错误状态
  magenta: '#d33682', // 品红强调
  violet: '#6c71c4'   // 紫色强调
} as const;

export interface MessageBubbleStylesProps {
  isUser: boolean;
  isDarkMode: boolean;
}

export const createMessageBubbleStyles = ({ isUser, isDarkMode }: MessageBubbleStylesProps) => {
  const colors = solarizedColors;
  
  return {
    container: {
      display: 'flex',
      marginBottom: '12px',
      alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start'
    } as CSSProperties,

    wrapper: {
      maxWidth: isUser ? '80%' : '90%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    } as CSSProperties,

    meta: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: '8px',
      marginBottom: '4px'
    } as CSSProperties,

    modelName: {
      fontSize: '12px',
      fontWeight: '600',
      color: isDarkMode ? colors.base00 : colors.base01
    } as CSSProperties,

    timestamp: {
      fontSize: '12px',
      color: isDarkMode ? colors.base01 : colors.base1
    } as CSSProperties,

    thinkingPanel: {
      backgroundColor: 'transparent',
      border: `1px solid rgba(181, 137, 0, ${isDarkMode ? '0.35' : '0.3'})`,
      borderRadius: '6px',
      overflow: 'hidden'
    } as CSSProperties,

    thinkingLabel: {
      fontSize: '12px',
      color: isDarkMode ? colors.base0 : colors.base01
    } as CSSProperties,

    thinkingContent: {
      padding: '8px 12px',
      fontSize: '13px',
      lineHeight: '1.4'
    } as CSSProperties,

    bubble: {
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      lineHeight: '1.5',
      backgroundColor: isUser 
        ? (isDarkMode 
            ? '#000000' // pure black
            : `rgba(38, 139, 210, 0.1)`)
        : (isDarkMode ? 'transparent' : colors.base2),
      border: `1px solid ${isUser 
        ? (isDarkMode 
            ? `rgba(38, 139, 210, 0.25)` 
            : `rgba(38, 139, 210, 0.2)`)
        : (isDarkMode 
            ? `rgba(88, 110, 117, 0.2)` // base01 with opacity
            : `rgba(147, 161, 161, 0.2)`)}`, // base1 with opacity
      color: isDarkMode ? colors.base0 : colors.base01
    } as CSSProperties,

    actions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: '8px'
    } as CSSProperties,

    actionButton: {
      color: colors.cyan,
      border: 'none',
      boxShadow: 'none',
      padding: '4px',
      borderRadius: '4px',
      transition: 'opacity 0.2s ease'
    } as CSSProperties,

    actionButtonHover: {
      opacity: 0.7
    } as CSSProperties,

    thinkingIcon: {
      color: colors.yellow,
      fontSize: '12px'
    } as CSSProperties,

    loadingIcon: {
      color: isDarkMode ? colors.base1 : colors.base01
    } as CSSProperties
  };
};