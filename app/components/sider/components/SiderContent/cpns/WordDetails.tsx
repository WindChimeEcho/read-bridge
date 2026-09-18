import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'
import ReasoningCollapse from '@/app/components/common/ReasoningCollapse'

export default function WordDetails({
  wordDetails,
  reasoning,
}: {
  wordDetails: string
  reasoning: string
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <ReasoningCollapse content={reasoning} />
      <MarkdownRendererWrapper content={wordDetails} />
    </div>
  )
}

WordDetails.displayName = 'WordDetails';
