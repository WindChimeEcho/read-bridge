import { Divider, Empty } from 'antd'
import { useMemo } from 'react'
import { CurrentSentence, MenuLine, Sentences, WordDetails } from './cpns'
import { useSentenceAnalysis } from '@/hooks/useSentenceAnalysis'
import { useWordLookup } from '@/hooks/useWordLookup'
import { useTranslation } from '@/i18n/useTranslation'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'

export default function SiderContent() {
  const { t } = useTranslation()
  const analysisTab = useReaderSessionStore(state => state.analysisTab)
  const setAnalysisTab = useReaderSessionStore(state => state.setAnalysisTab)

  const {
    sentence,
    analyses,
    bookmarkInfo,
    canRun,
    editSentence,
    toggleBookmark,
  } = useSentenceAnalysis()

  const {
    word,
    wordDetails,
    wordReasoning,
    lookupWord,
  } = useWordLookup(sentence)

  const selectedTab = analysisTab === 'word' ? 'word-details' : 'sentence-analysis'

  const menuItems = useMemo(() => [
    { label: t('sider.sentenceAnalysis'), key: 'sentence-analysis' },
    { label: t('sider.wordDetails'), key: 'word-details', disabled: !word },
  ], [t, word])

  const handleTabChange = (key: string) => {
    setAnalysisTab(key === 'word-details' ? 'word' : 'sentence')
  }

  return (
    <div className="w-full h-[calc(100%-32px)] flex flex-col">
      <CurrentSentence
        sentence={sentence}
        handleWord={lookupWord}
        onEditComplete={editSentence}
        currentBookmarkInfo={bookmarkInfo}
        onBookmarkToggle={toggleBookmark}
      />
      <Divider className="my-0" />
      <MenuLine selectedTab={selectedTab} items={menuItems} onTabChange={handleTabChange} />
      <div className={selectedTab === 'sentence-analysis' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
        {analyses.length > 0
          ? <Sentences sentenceProcessingList={analyses} />
          : <Empty description={canRun ? t('sider.noSentenceSelected') : t('sider.noAnalysisModelSelected')} className="flex flex-col items-center justify-center h-[262px]" />}
      </div>
      <div className={selectedTab === 'word-details' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
        {word && canRun
          ? <WordDetails wordDetails={wordDetails} reasoning={wordReasoning} />
          : <Empty description={canRun ? t('sider.noWordSelected') : t('sider.noAnalysisModelSelected')} className="flex flex-col items-center justify-center h-[262px]" />}
      </div>
      <Divider className="my-0" />
    </div>
  )
}
