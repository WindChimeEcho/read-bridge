'use client';

import { ConfigProvider, theme } from 'antd';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: currentTheme } = useThemeStore();
  console.log(currentTheme, 'currentTheme')
  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {

        },
      }}
    >
      {children}
    </ConfigProvider>
  );
} 