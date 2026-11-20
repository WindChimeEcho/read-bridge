'use client'

import React, { useRef } from 'react'
import { Layout, Menu, theme } from 'antd'
import type { MenuProps } from 'antd'
import {
  AlignLeftOutlined,
  AppstoreFilled,
  CloudSyncOutlined,
  FileWordOutlined,
  OrderedListOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { StarIcon } from '@/assets/icon'
import { useTranslation } from '@/i18n/useTranslation'
import {
  AiSection,
  BackupSection,
  DefaultModelSection,
  PromptSection,
  SentenceProcessingSection,
  TTSSection,
  WordProcessingSection,
} from '@/app/setting/components'

const { Sider, Content } = Layout

export default function DesktopSetting() {
  const { token } = theme.useToken()
  const { t } = useTranslation()

  const settingsConfig = [
    {
      key: 'ai',
      icon: <StarIcon />,
      label: t('settings.aiSettings'),
      content: <AiSection />,
    },
    {
      key: 'defaultModel',
      icon: <AppstoreFilled style={{ fontSize: 24 }} />,
      label: t('settings.modelConfig'),
      content: <DefaultModelSection />,
    },
    {
      key: 'prompt',
      icon: <AlignLeftOutlined style={{ fontSize: 24 }} />,
      label: t('settings.promptConfig'),
      content: <PromptSection />,
    },
    {
      key: 'sentenceProcessing',
      icon: <OrderedListOutlined style={{ fontSize: 24 }} />,
      label: t('settings.sentenceConfig'),
      content: <SentenceProcessingSection />,
    },
    {
      key: 'wordProcessing',
      icon: <FileWordOutlined style={{ fontSize: 24 }} />,
      label: t('settings.wordConfig'),
      content: <WordProcessingSection />,
    },
    {
      key: 'tts',
      icon: <SoundOutlined style={{ fontSize: 24 }} />,
      label: t('settings.ttsConfig'),
      content: <TTSSection />,
    },
    {
      key: 'backup',
      icon: <CloudSyncOutlined style={{ fontSize: 24 }} />,
      label: t('backup.title'),
      content: <BackupSection />,
    },
  ]

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const menuItems: MenuProps['items'] = settingsConfig.map(({ key, icon, label }) => ({
    key,
    icon: React.cloneElement(icon, { color: token.colorText }),
    label,
  }))

  const handleMenuClick = (key: string) => {
    const ref = sectionRefs.current[key]
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <Layout className="w-full h-full p-4">
      <Sider
        width={200}
        className="h-full"
        style={{
          position: 'fixed',
          left: 0,
          overflow: 'auto',
        }}
      >
        <Menu
          mode="inline"
          className="h-full"
          items={menuItems}
          defaultSelectedKeys={['ai']}
          onClick={({ key }) => handleMenuClick(key.toString())}
        />
      </Sider>
      <Content className="w-full h-full pl-[224px] m-0">
        {settingsConfig.map(({ key, icon, label, content }) => (
          <div
            key={key}
            ref={(el) => { sectionRefs.current[key] = el }}
            id={key}
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-4">
              {React.cloneElement(icon, { color: token.colorText })}
              <div className="text-[24px] font-bold">{label}</div>
            </div>
            {content}
          </div>
        ))}
      </Content>
    </Layout>
  )
}
