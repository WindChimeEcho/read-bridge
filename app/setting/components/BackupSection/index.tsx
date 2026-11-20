'use client'

import { useState } from 'react'
import { Alert, Button, Descriptions, Radio, Space, Switch, Tag, Typography } from 'antd'
import { CloudDownloadOutlined, CloudUploadOutlined } from '@ant-design/icons'
import { Card } from '../index'
import { type BackupConflictStrategy, useBackup } from '@/hooks/useBackup'
import { useTranslation } from '@/i18n/useTranslation'

export default function BackupSection() {
  const { t } = useTranslation()
  const {
    includeApiKeys,
    setIncludeApiKeys,
    isExporting,
    isImporting,
    pendingArchive,
    exportFullBackup,
    pickBackupFile,
    confirmImport,
    clearPendingArchive,
  } = useBackup()

  const [strategy, setStrategy] = useState<BackupConflictStrategy>('skip')

  return (
    <Card>
      <div className="space-y-4">
        <Typography.Paragraph type="secondary" className="!mb-0">
          {t('backup.description')}
        </Typography.Paragraph>

        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-[var(--ant-color-border)]">
          <div>
            <div className="font-medium">{t('backup.includeApiKeys')}</div>
            <Typography.Text type="secondary" className="text-xs">
              {t('backup.includeApiKeysHint')}
            </Typography.Text>
          </div>
          <Switch checked={includeApiKeys} onChange={setIncludeApiKeys} />
        </div>

        <Space wrap>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={isExporting}
            onClick={() => {
              void exportFullBackup()
            }}
          >
            {isExporting ? t('backup.exporting') : t('backup.exportButton')}
          </Button>
          <Button
            icon={<CloudUploadOutlined />}
            disabled={isImporting}
            onClick={() => {
              void pickBackupFile()
            }}
          >
            {t('backup.importButton')}
          </Button>
        </Space>

        {pendingArchive && (
          <div className="mt-4 p-4 rounded-lg border border-[var(--ant-color-border)] space-y-4">
            <Alert
              type="info"
              showIcon
              message={t('backup.summaryTitle')}
              description={pendingArchive.fileName}
            />

            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label={t('backup.exportType')}>
                {pendingArchive.summary.manifest.exportType === 'full'
                  ? t('backup.typeFull')
                  : t('backup.typeBook')}
              </Descriptions.Item>
              <Descriptions.Item label={t('backup.booksCount')}>
                {t('backup.booksSummary', {
                  total: String(pendingArchive.summary.totalBooks),
                  newCount: String(pendingArchive.summary.newBookCount),
                  duplicateCount: String(pendingArchive.summary.duplicateBookCount),
                })}
              </Descriptions.Item>
              <Descriptions.Item label={t('backup.bookmarksCount')}>
                {pendingArchive.summary.totalBookmarks}
              </Descriptions.Item>
              <Descriptions.Item label={t('backup.historiesCount')}>
                {pendingArchive.summary.totalHistories}
              </Descriptions.Item>
              <Descriptions.Item label={t('backup.settingsIncluded')}>
                {pendingArchive.summary.hasSettings ? t('backup.yes') : t('backup.no')}
              </Descriptions.Item>
              <Descriptions.Item label={t('backup.apiKeyStatus')}>
                <Tag color={pendingArchive.summary.includeApiKeys ? 'gold' : 'green'}>
                  {pendingArchive.summary.includeApiKeys
                    ? t('backup.apiKeysIncludedTag')
                    : t('backup.apiKeysRedactedTag')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div>
              <div className="mb-2 font-medium">{t('backup.strategyLabel')}</div>
              <Radio.Group
                value={strategy}
                onChange={e => setStrategy(e.target.value as BackupConflictStrategy)}
              >
                <Space direction="vertical">
                  <Radio value="skip">{t('backup.strategySkip')}</Radio>
                  <Radio value="overwrite">{t('backup.strategyOverwrite')}</Radio>
                </Space>
              </Radio.Group>
            </div>

            <Space>
              <Button onClick={clearPendingArchive} disabled={isImporting}>
                {t('common.cancel')}
              </Button>
              <Button
                type="primary"
                loading={isImporting}
                onClick={() => {
                  void confirmImport(strategy)
                }}
              >
                {isImporting ? t('backup.importing') : t('backup.confirmImport')}
              </Button>
            </Space>
          </div>
        )}
      </div>
    </Card>
  )
}
