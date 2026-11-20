'use client'

import type { CSSProperties, ReactNode } from 'react'
import { Button, Layout, theme } from 'antd'
import { CaretDownFilled } from '@ant-design/icons'
import HeaderContent from '@/app/components/header'
import FooterContent from '@/app/components/footer'
import Preload from '@/app/components/preload'
import Sider from '@/app/_views/desktop/sider'
import { useHeaderStore } from '@/store/useHeaderStore'

const { Header, Content, Footer } = Layout

const layoutStyle: CSSProperties = {
  height: '100dvh',
  width: '100%',
  maxWidth: '1920px',
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
}

const headerStyle: CSSProperties = {
  height: 'auto',
  lineHeight: '64px',
  position: 'sticky',
  top: 0,
  zIndex: 1,
  padding: 0,
  width: '100%',
  transition: 'all 0.3s ease-in-out',
  overflow: 'hidden',
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
}

const footerStyle: CSSProperties = {
  position: 'sticky',
  bottom: 0,
  padding: '0',
  width: '100%',
  height: '28px',
}

const headerToggleButtonStyle: CSSProperties = {
  position: 'fixed',
  top: '-8px',
  right: '40px',
  zIndex: 2,
  opacity: 1,
  transition: 'all 0.3s ease-in-out',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  width: '32px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transform: 'translateY(0)',
  cursor: 'pointer',
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const { collapsed, toggleCollapsed } = useHeaderStore()
  const { token } = theme.useToken()

  const dynamicHeaderStyle: CSSProperties = {
    ...headerStyle,
    height: collapsed ? '0' : '64px',
    opacity: collapsed ? 0 : 1,
    pointerEvents: collapsed ? 'none' : 'auto',
  }

  const dynamicToggleButtonStyle: CSSProperties = {
    ...headerToggleButtonStyle,
    opacity: collapsed ? 1 : 0,
    transform: collapsed ? 'translateY(0)' : 'translateY(-100%)',
    pointerEvents: collapsed ? 'auto' : 'none',
    backgroundColor: token.colorBgContainer,
    color: token.colorText,
    border: `1px solid ${token.colorBorder}`,
  }

  const iconStyle: CSSProperties = {
    fontSize: 16,
    transition: 'transform 0.3s ease',
  }

  return (
    <Layout style={layoutStyle}>
      <Preload />
      <Header style={dynamicHeaderStyle}><HeaderContent /></Header>
      {collapsed && (
        <Button
          type="text"
          icon={<CaretDownFilled style={iconStyle} className="transform translate-y-[4px]" />}
          style={dynamicToggleButtonStyle}
          onClick={toggleCollapsed}
          className="transition-all duration-300"
        />
      )}
      <div className="flex flex-1 overflow-hidden flex-row">
        <Content style={contentStyle}>
          {children}
        </Content>
        <Sider />
      </div>
      <Footer style={footerStyle}><FooterContent /></Footer>
    </Layout>
  )
}
