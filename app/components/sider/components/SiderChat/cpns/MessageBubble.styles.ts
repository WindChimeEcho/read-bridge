import type { CSSProperties } from 'react';
import { READING_THEME_PALETTES, type ReadingTheme } from '@/config/theme';

export interface MessageBubbleStylesProps {
  isUser: boolean;
  readingTheme: ReadingTheme;
}

export const createMessageBubbleStyles = ({ isUser, readingTheme }: MessageBubbleStylesProps) => {
  const palette = READING_THEME_PALETTES[readingTheme];
  const isDarkMode = readingTheme === 'dark';

  return {
    container: {
      display: 'flex',
      marginBottom: '12px',
      alignItems: 'flex-start',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    } as CSSProperties,

    wrapper: {
      maxWidth: isUser ? '80%' : '90%',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    } as CSSProperties,

    meta: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: '8px',
      marginBottom: '4px',
    } as CSSProperties,

    modelName: {
      fontSize: '12px',
      fontWeight: '600',
      color: palette.textSecondary,
    } as CSSProperties,

    timestamp: {
      fontSize: '12px',
      color: palette.textSecondary,
    } as CSSProperties,

    thinkingPanel: {
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: '6px',
      overflow: 'hidden',
    } as CSSProperties,

    thinkingLabel: {
      fontSize: '12px',
      color: palette.textSecondary,
    } as CSSProperties,

    thinkingContent: {
      padding: '8px 12px',
      fontSize: '13px',
      lineHeight: '1.4',
    } as CSSProperties,

    bubble: {
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      lineHeight: '1.5',
      backgroundColor: isUser ? palette.highlightBg : palette.muted,
      border: `1px solid ${isUser
        ? (isDarkMode ? 'rgba(99, 102, 241, 0.35)' : 'rgba(79, 70, 229, 0.2)')
        : palette.border}`,
      color: palette.textPrimary,
    } as CSSProperties,

    actions: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: '8px',
    } as CSSProperties,

    actionButton: {
      color: palette.accent,
      border: 'none',
      boxShadow: 'none',
      padding: '4px',
      borderRadius: '4px',
      transition: 'opacity 0.2s ease',
    } as CSSProperties,

    thinkingIcon: {
      color: palette.accent,
      fontSize: '12px',
    } as CSSProperties,

    loadingIcon: {
      color: palette.textSecondary,
    } as CSSProperties,
  };
};
