'use client';

import { Button, ColorPicker, theme, Segmented } from 'antd';
import { useStyleStore, FontSize } from '@/store/useStyleStore';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { getEffectiveTextColor } from '@/config/theme';

export default function Footer() {
  const { token } = theme.useToken();
  const { t } = useTranslation();
  const {
    readingTheme,
    useCustomTextColor,
    lightModeTextColor,
    darkModeTextColor,
    setLightModeTextColor,
    setDarkModeTextColor,
    resetTextColors,
    fontSize,
    setFontSize,
  } = useStyleStore();
  const [mounted, setMounted] = useState(false);
  const [tempColor, setTempColor] = useState('');

  const effectiveTextColor = getEffectiveTextColor(
    readingTheme,
    lightModeTextColor,
    darkModeTextColor,
    useCustomTextColor
  );

  useEffect(() => {
    setMounted(true);
    setTempColor(effectiveTextColor);
  }, [effectiveTextColor]);

  if (!mounted) return null;

  const handleConfirm = () => {
    if (readingTheme === 'dark') {
      setDarkModeTextColor(tempColor);
    } else {
      setLightModeTextColor(tempColor);
    }
  };

  return (
    <div
      className="w-full h-full flex justify-start items-center border-t pl-4 pr-4 gap-3 overflow-hidden"
      style={{
        borderColor: token.colorBorder,
        backgroundColor: token.colorBgContainer,
      }}
    >
      <ColorPicker
        value={tempColor}
        size="small"
        onChange={(color) => {
          setTempColor(color.toHexString());
        }}
        panelRender={(panel) => (
          <div className="flex flex-col gap-2">
            {panel}
            <div className="flex gap-2">
              <Button type="text" className="flex-1" onClick={handleConfirm}>
                {t('theme.changeTextColor')}
              </Button>
              {useCustomTextColor && (
                <Button type="text" onClick={resetTextColors}>
                  {t('theme.resetTextColor')}
                </Button>
              )}
            </div>
          </div>
        )}
      />
      <Segmented
        options={[
          { label: t('fontSize.small'), value: 'small' as FontSize },
          { label: t('fontSize.medium'), value: 'medium' as FontSize },
          { label: t('fontSize.large'), value: 'large' as FontSize },
        ]}
        value={fontSize}
        onChange={setFontSize}
        size="small"
      />
    </div>
  );
}
