import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'

export default function WordDetails({ wordDetails }: { wordDetails: string }) {
  return <MarkdownRendererWrapper content={wordDetails} className="flex-1 min-h-0 overflow-y-auto" />
}

WordDetails.displayName = 'WordDetails';