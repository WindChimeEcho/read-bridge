'use client';

import { ConfigProvider, message, theme } from 'antd';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useStyleStore } from '@/store/useStyleStore';
import {
  applyReadingThemeCSSVars,
  getEffectiveTextColor,
  isReadingTheme,
  READING_THEME_PALETTES,
  type ReadingTheme,
} from '@/config/theme';
import { resetNotifyAdapter, setNotifyAdapter } from '@/services/platform/notify';

function generateAntdTheme(currentTheme: ReadingTheme, effectiveTextColor: string) {
  const palette = READING_THEME_PALETTES[currentTheme];
  const isDark = currentTheme === 'dark';

  return {
    cssVar: true,
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: palette.accent,
      colorBgLayout: palette.canvas,
      colorBgContainer: currentTheme === 'paper' ? palette.canvas : palette.surface,
      colorBgElevated: palette.elevated,
      colorBorder: palette.border,
      colorBorderSecondary: palette.borderSecondary,
      colorText: effectiveTextColor,
      colorTextSecondary: palette.textSecondary,
    },
    components: {
      Card: {
        colorBgContainer: palette.surface,
        colorBorderSecondary: palette.borderSecondary,
        bodyPadding: 8,
      },
      Input: {
        colorBgContainer: palette.surface,
      },
      Select: {
        colorBgContainer: palette.surface,
      },
      Menu: {
        colorBgContainer: currentTheme === 'dark' ? palette.chromeBg : (currentTheme === 'paper' ? palette.canvas : palette.surface),
      },
      Layout: {
        headerBg: currentTheme === 'light' ? palette.surface : palette.chromeBg,
        footerBg: currentTheme === 'light' ? palette.surface : palette.chromeBg,
        siderBg: currentTheme === 'dark' ? palette.chromeBg : (currentTheme === 'paper' ? palette.canvas : palette.surface),
      },
    },
  };
}

function AntdProvider({ children }: { children: React.ReactNode }) {
  const { setTheme: setNextTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const {
    readingTheme,
    themeInitialized,
    setReadingTheme,
    lightModeTextColor,
    darkModeTextColor,
    useCustomTextColor,
  } = useStyleStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setNotifyAdapter({
      success: (content) => { message.success(content); },
      error: (content) => { message.error(content); },
      warning: (content) => { message.warning(content); },
      info: (content) => { message.info(content); },
    });
    return () => resetNotifyAdapter();
  }, []);

  useEffect(() => {
    if (!mounted || themeInitialized) return;

    const legacy = window.localStorage.getItem('theme');
    if (isReadingTheme(legacy)) {
      setReadingTheme(legacy);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setReadingTheme('dark');
      return;
    }

    const isSmallViewport = window.matchMedia('(max-width: 767px)').matches;
    setReadingTheme(isSmallViewport ? 'paper' : 'light');
  }, [mounted, themeInitialized, setReadingTheme]);

  const effectiveTextColor = getEffectiveTextColor(
    readingTheme,
    lightModeTextColor,
    darkModeTextColor,
    useCustomTextColor
  );

  useEffect(() => {
    if (!mounted) return;
    setNextTheme(readingTheme === 'dark' ? 'dark' : 'light');
    applyReadingThemeCSSVars(document.documentElement, readingTheme, effectiveTextColor);
  }, [mounted, readingTheme, effectiveTextColor, setNextTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <ConfigProvider theme={generateAntdTheme(readingTheme, effectiveTextColor)}>
      {children}
    </ConfigProvider>
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system">
      <AntdProvider>{children}</AntdProvider>
    </NextThemeProvider>
  );
}
