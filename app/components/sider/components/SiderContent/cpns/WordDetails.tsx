import ChatMarkdown from '@/app/components/common/ChatMarkdown'
import { useTheme } from 'next-themes'

export default function WordDetails({ wordDetails }: { wordDetails: string }) {
  const { theme } = useTheme()
  return <ChatMarkdown content={wordDetails} theme={theme as 'light' | 'dark'} className="flex-1 min-h-0 overflow-y-auto" />
}

WordDetails.displayName = 'WordDetails';