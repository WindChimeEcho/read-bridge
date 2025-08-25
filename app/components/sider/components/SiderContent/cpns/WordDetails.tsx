import ChatMarkdownWrapper from '@/app/components/common/ChatMarkdownWrapper'

export default function WordDetails({ wordDetails }: { wordDetails: string }) {
  return <ChatMarkdownWrapper content={wordDetails} className="flex-1 min-h-0 overflow-y-auto" />
}

WordDetails.displayName = 'WordDetails';