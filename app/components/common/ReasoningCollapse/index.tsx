import { Collapse } from 'antd'

type ReasoningCollapseProps = {
  content: string
  label?: string
}

export default function ReasoningCollapse({
  content,
  label = 'Reasoning',
}: ReasoningCollapseProps) {
  if (!content) return null

  return (
    <Collapse
      size="small"
      ghost
      className="[&_.ant-collapse-header]{padding:0}"
      items={[{
        key: 'reasoning',
        label,
        children: <p className="whitespace-pre-wrap">{content}</p>,
      }]}
    />
  )
}
