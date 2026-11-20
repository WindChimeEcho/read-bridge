'use client';
import { useRouter, usePathname } from 'next/navigation';
import { Button, Dropdown, Menu, theme } from 'antd';
import type { MenuProps } from 'antd';
import { LogoIcon } from '@/assets/icon';
import {
  GithubOutlined,
  SunOutlined,
  MoonOutlined,
  ReadOutlined,
  CaretUpFilled,
  SettingOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { useSiderStore } from '@/store/useSiderStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useStyleStore } from '@/store/useStyleStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { ReadingTheme } from '@/config/theme';

export default function Header() {
  const { token } = theme.useToken();
  const { readingTheme, setReadingTheme } = useStyleStore();

  return (
    <div
      className="header flex justify-between w-full h-full shadow-sm transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorder}`,
        overflow: 'hidden',
      }}>
      <HeaderLogoArea />
      <HeaderContentArea />
      <HeaderIconArea readingTheme={readingTheme} onSelectTheme={setReadingTheme} />
    </div>
  );
}

function HeaderLogoArea() {
  const router = useRouter();
  const { token } = theme.useToken();

  return (
    <div className="flex w-[16%] min-w-[200px] h-full items-center pl-[40px] cursor-pointer" onClick={() => router.push('/')}>
      <LogoIcon size={32} color={token.colorText} />
      <div className="text-[18px] font-bold ml-2">
        Read Bridge
      </div>
    </div>
  );
}

function HeaderContentArea() {
  const { readingId } = useSiderStore();
  const { t } = useTranslation();

  const items = [
    {
      label: t('header.home'),
      key: '/',
    },
    {
      label: t('header.reading'),
      key: '/read',
      disabled: !readingId,
    },
  ];
  const router = useRouter();
  const current = usePathname().split('?')[0];
  const onClick = (info: { key: string }) => {
    router.push(info.key);
  };

  return (
    <div className="flex w-full h-full">
      <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />
    </div>
  );
}

function HeaderIconArea({
  readingTheme,
  onSelectTheme,
}: {
  readingTheme: ReadingTheme;
  onSelectTheme: (theme: ReadingTheme) => void;
}) {
  const { t } = useTranslation();
  const iconStyle = { fontSize: 20 };
  const ThemeIcon = readingTheme === 'dark'
    ? MoonOutlined
    : (readingTheme === 'paper' ? ReadOutlined : SunOutlined);
  const { toggleCollapsed } = useHeaderStore();
  const { toggleLanguage } = useStyleStore();
  const router = useRouter();

  const themeMenu: MenuProps = {
    selectedKeys: [readingTheme],
    onClick: ({ key }) => onSelectTheme(key as ReadingTheme),
    items: [
      { key: 'paper', icon: <ReadOutlined />, label: t('theme.paper') },
      { key: 'light', icon: <SunOutlined />, label: t('theme.light') },
      { key: 'dark', icon: <MoonOutlined />, label: t('theme.dark') },
    ],
  };

  return (
    <div className="flex w-[16%] h-full items-center justify-end pr-[40px]">
      <Button
        type="text"
        size="large"
        icon={<GithubOutlined style={iconStyle} />}
        onClick={() => window.open('https://github.com/WindChimeEcho/read-bridge', '_blank')}
      />
      <Button
        type="text"
        size="large"
        icon={<SettingOutlined style={iconStyle} />}
        onClick={() => router.push('/setting')}
      />
      <Button
        type="text"
        size="large"
        icon={<TranslationOutlined style={iconStyle} />}
        onClick={toggleLanguage}
      />
      <Dropdown menu={themeMenu} trigger={['click']} placement="bottomRight">
        <Button
          type="text"
          size="large"
          icon={<ThemeIcon style={iconStyle} />}
        />
      </Dropdown>
      <Button
        type="text"
        size="large"
        icon={<CaretUpFilled style={{ ...iconStyle, transition: 'transform 0.3s' }} />}
        onClick={toggleCollapsed}
      />
    </div>
  );
}
