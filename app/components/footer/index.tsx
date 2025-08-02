'use client';

import { Button, ColorPicker, theme, Segmented } from 'antd';
import { useTheme } from 'next-themes';
import { useStyleStore, FontSize } from '@/store/useStyleStore';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

export default function Footer() {
  const { theme: currentTheme } = useTheme();
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const {
    lightModeTextColor,
    darkModeTextColor,
    setLightModeTextColor,
    setDarkModeTextColor,
    fontSize,
    setFontSize
  } = useStyleStore();
  const [mounted, setMounted] = useState(false);
  const [tempColor, setTempColor] = useState('');

  useEffect(() => {
    setMounted(true);
    setTempColor(currentTheme === 'dark' ? darkModeTextColor : lightModeTextColor);
  }, [currentTheme, darkModeTextColor, lightModeTextColor]);

  if (!mounted) return null;

  const handleConfirm = () => {
    if (currentTheme === 'dark') {
      setDarkModeTextColor(tempColor);
    } else {
      setLightModeTextColor(tempColor);
    }
  };


  return (
    <div className="w-full h-full flex justify-start items-center border-t pl-4 pr-4 gap-3 overflow-hidden" style={{ borderColor: token.colorBorder }}>
      <ColorPicker
        value={tempColor}
        size="small"
        onChange={(color) => {
          setTempColor(color.toHexString());
        }}
        panelRender={(panel) => (
          <div className="flex flex-col gap-2">
            {panel}
            <Button type="text" block onClick={handleConfirm}>
              更改字体颜色
            </Button>
          </div>
        )}
      />
      <Segmented
        options={[
          { label: t('fontSize.small'), value: 'small' as FontSize },
          { label: t('fontSize.medium'), value: 'medium' as FontSize },
          { label: t('fontSize.large'), value: 'large' as FontSize }
        ]}
        value={fontSize}
        onChange={setFontSize}
        size="small"
      />
    </div>
  )
}
