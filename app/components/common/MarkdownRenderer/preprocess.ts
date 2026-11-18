export function preprocessMarkdown(raw: string): string {
  if (!raw) return ''

  // 1. LaTeX delimiter normalization: \(...\) -> $...$ and \[...\] -> $$...$$
  let text = raw
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')

  // 2. Auto-complete unclosed streaming tags (<details>, <fold>, <explain>, <summary>)
  const summaryOpens = (text.match(/<summary\b[^>]*>/gi) || []).length
  const summaryCloses = (text.match(/<\/summary\s*>/gi) || []).length
  if (summaryOpens > summaryCloses) {
    text += '</summary>'.repeat(summaryOpens - summaryCloses)
  }

  const tagTypes = ['details', 'fold', 'explain'] as const
  for (const tag of tagTypes) {
    const openRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
    const closeRegex = new RegExp(`</${tag}\\s*>`, 'gi')
    const openCount = (text.match(openRegex) || []).length
    const closeCount = (text.match(closeRegex) || []).length
    if (openCount > closeCount) {
      text += `\n\n</${tag}>`.repeat(openCount - closeCount)
    }
  }

  // 3. Ensure double newlines after opening tags (<details>, </summary>, <fold>, <explain>)
  // and before closing tags (</details>, </fold>, </explain>) so CommonMark parses inner Markdown
  text = text
    .replace(/(<(?:details|fold|explain)\b[^>]*>)\s*/gi, '$1\n\n')
    .replace(/(<\/summary\s*>)\s*/gi, '$1\n\n')
    .replace(/\s*(<\/(?:details|fold|explain)\s*>)/gi, '\n\n$1')

  // Keep <summary> immediately inside <details> without blank line if <summary> follows <details>
  text = text.replace(/(<details\b[^>]*>)\n\n(\s*<summary\b)/gi, '$1\n$2')

  return text
}
