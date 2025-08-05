import MarkdownViewer from '@/app/components/common/MarkdownViewer'

export default function WordDetails({ wordDetails }: { wordDetails: string }) {
  return <MarkdownViewer content={wordDetails} className="flex-1 min-h-0 overflow-y-auto" />
}

WordDetails.displayName = 'WordDetails';