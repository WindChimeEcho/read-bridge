import { Alert } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import CardComponent from '@/app/components/common/CardComponent'
import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'
import ReasoningCollapse from '@/app/components/common/ReasoningCollapse'
import type { AnalysisResult, SentenceAnalysis } from '@/types/ai'

export default function Sentences({ sentenceProcessingList }: {
  sentenceProcessingList: SentenceAnalysis[]
}) {
  return (
    <div className="w-full flex-1 min-h-0 p-4 overflow-y-auto">
      {sentenceProcessingList.map(analysis => (
        <AnalysisCard key={analysis.id} analysis={analysis} />
      ))}
    </div>
  )
}

function AnalysisCard({ analysis }: { analysis: SentenceAnalysis }) {
  const isMarkdown = analysis.result.type === 'MD'

  return (
    <CardComponent
      className="mb-2"
      title={isMarkdown ? undefined : analysis.name}
    >
      <ReasoningCollapse content={analysis.reasoning} />
      {analysis.error && <Alert type="error" showIcon message={analysis.error} />}
      {analysis.status === 'streaming' && !hasContent(analysis.result) && <LoadingOutlined />}
      <AnalysisContent result={analysis.result} />
    </CardComponent>
  )
}

function AnalysisContent({ result }: { result: AnalysisResult }) {
  switch (result.type) {
    case 'TEXT':
      return <div className="whitespace-pre-wrap">{result.content}</div>
    case 'MD':
      return <MarkdownRendererWrapper content={result.content} />
    case 'SIMPLE_LIST':
      return (
        <ul className="list-disc pl-5">
          {result.items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}
        </ul>
      )
    case 'KEY_VALUE_LIST':
      return (
        <div>
          {result.items.map((item, index) => (
            <div className="mb-2" key={`${index}:${item.label}`}>
              <span className="font-semibold">{item.label}</span>
              {item.label && item.description ? ': ' : ''}
              <span>{item.description}</span>
            </div>
          ))}
        </div>
      )
  }
}

function hasContent(result: AnalysisResult): boolean {
  switch (result.type) {
    case 'TEXT':
    case 'MD':
      return result.content.trim().length > 0
    case 'SIMPLE_LIST':
    case 'KEY_VALUE_LIST':
      return result.items.length > 0
  }
}
