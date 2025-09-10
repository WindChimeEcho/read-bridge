import { ChatCompletionMessageParam } from "openai/resources/index.mjs"

const WORD_DETAILS = `
function WordHelper(word: string, sentence: string) {
  /**
   * Purpose: Help language learners understand unfamiliar words in context
   * Input: A word and the sentence containing it
   * Output: All output must be in the same language as the input, including format markers
   * The function automatically detects the input language and responds accordingly
   * Use simpler words in proportional sentences to help users learn.
   */
    return \`
    ## \${word} [/Standard IPA pronunciation that matches the language of \${word}/ For example, English is phonetic and Chinese is pinyin]
    **Definition**: [simple definition using easier vocabulary]

    **In this context**: [specific meaning in the given sentence]

    **Example**: [one clear example showing similar usage]

    **Synonyms**: [1-4 words, fewer is better, only include terms that could substitute]

    **Antonyms**: [if there are related antonyms]

    **Common Phrases**: [common phrases or fixed expressions]
  // Do not output anything other than the return statement
  // Return only the formatted response in the same language as the input
}
`

const FUNC_WORD_DETAILS = `
function Single_LanguageWordAnalyzer(word: string, sentence?: string): string {
  // Important: Maintain the same language between input and output - if input is English, output should be English; if input is Chinese, output should be Chinese.
  // As a foreign language teacher, you should immerse me in a native-like environment and penetrate to the essence of word meanings with precision, giving me profound insights
  // Please present your response in beautifully formatted Markdown, with proper heading hierarchy, consistent list indentation, and well-structured code blocks to ensure a professional and readable visual presentation.
  // sentence is the context of the word
  const markdown_string = \`
    ## **\${word}** [*phonetic notation*]

    ### Definition 1: {brief definition based on contextual usage - do not repeat the entire sentence}

    #### Breakdown:
    - {as a part of sentence this word means this}
    - {in this definition, the word can mean}
    - {or others, but keep the total breakdowns between 1-5}

    #### In-depth analysis: // 10-80 words maximum
    {Provide a concise explanation of the word using the sentence. Focus on core meaning, usage patterns, and cultural context when relevant. Avoid unnecessary elaboration.}

    #### Synonyms:
    - 1-4 words, fewer is better, only include terms that could substitute

    #### Example sentences:
    - 2-4 examples, fewer is better, one related to the reference sentence and one simple example of this usage. Add markers to help language learners easily understand the syntax and usage

    ### Definition 2: {the most common meaning of this word; if Definition 1 is already the most common meaning, then this should be the second most common} 
    Same format as above

    ### Definitions 3-4: {optional, maximum of four definitions total}
    \`
  return markdown_string
}
`


const SENTENCE_STRUCTURE_ANALYSIS = `
You are a sentence structure analyzer. Your task is to break down sentences into their meaningful components (phrases and clauses) without categorizing the sentence type or providing linguistic classifications.
`
const EXTRACT_KEY_WORDS = `
Extract key vocabulary and expressions.  More detailed explanations, expanded usage, Output using the input language
`
const SENTENCE_REWRITE = `
# Sentence Simplification Instructions
Rewrite complex sentences into simpler expressions, maintaining the original meaning while using more basic vocabulary and syntax.
## IMPORTANT: Language Requirement
- You MUST output in EXACTLY the same language as the input
- Do NOT translate the content to another language
- If input is in Chinese, output in Chinese; if input is in English, output in English, any other language, output in the same language
## Simplification Requirements:
- Use more common, simpler vocabulary
- Shorten sentence length
- Break down complex sentence structures
- Remove unnecessary modifiers
- Preserve the core meaning of the original sentence
- Make it understandable for lower-level language learners
`

const CHAT_PROMPT = `
You are a helpful reading assistant for n+1 language learning through reading. 
Help users understand book content that's slightly above their current language level. Explain unfamiliar words or phrases when asked, provide simple clarifications of complex passages, and engage in natural discussion about the text to reinforce comprehension while keeping conversations encouraging and supportive.
`


const MD_SENTENCE_SIMPLIFICATION = `
function SentenceSimplification(sentence: string) {
 \`Instructions Rewrite complex sentences into simpler expressions, 
  maintaining the original meaning while using more basic vocabulary and syntax. 
  ## IMPORTANT: Language Requirement 
  - You MUST output in EXACTLY the same language as the input 
  - Do NOT translate the content to another language 
  - If input is in Chinese, output in Chinese; if input is in English, output in English, any other language, output in the same language 
  ## Simplification Requirements: 
  - Use more common, simpler vocabulary 
  - Shorten sentence length 
  - Break down complex sentence structures 
  - Remove unnecessary modifiers 
  - Preserve the core meaning of the original sentence 
  - Make it understandable for lower-level language learners
  - The sentence must be simpler. If the sentence is already simple enough, no further simplification is needed.\`
  return \`
  #### Rewrite Sentence
  \${rewriteSentence}
  // Compare the input sentence with the simplified sentence and output a mapping
  #### Mapping
  **\${originSentenceFragment}**: \${newSentenceFragment}
  // END
  \`
  // don't output anything else
}
`


export const INPUT_PROMPT = {
  WORD_DETAILS,
  FUNC_WORD_DETAILS,
  SENTENCE_REWRITE,
  EXTRACT_KEY_WORDS,
  SENTENCE_STRUCTURE_ANALYSIS,
  CHAT_PROMPT,
  MD_SENTENCE_SIMPLIFICATION
} as const;

const TEXT = `
INPUT: {SENTENCE}
OUTPUT: 
HTML Text with Content
<p>...</p>
don't use other html tags
`

const SIMPLE_LIST = `
INPUT: {SENTENCE}
OUTPUT: 
HTML Unordered List with Content Items
<ul>
  <li>...</li>
  <li>...</li>
  <li>...</li>
  ...
  <!-- Content determined by instructions and LLM processing -->
</ul>
don't use other html tags
`

const KEY_VALUE_LIST = `
INPUT: {SENTENCE}
OUTPUT: 
HTML Unordered List with Content Items
<ul>
  <li>item: content</li>
  <li>item: content</li>
  <li>item: content</li>
  ...
  <!-- Content determined by instructions and LLM processing -->
</ul>
don't use other html tags
`

const MD = `
INPUT: {SENTENCE}
OUTPUT: markdown
Please output pure Markdown directly without code block markers (\`\`\`markdown), ensuring content is directly renderable.
`
const MD_WORD = `
INPUT: word: {WORD} sentence: {SENTENCE}
OUTPUT: markdown
Please output pure Markdown directly without code block markers (\`\`\`markdown), ensuring content is directly renderable.
`
export const OUTPUT_PROMPT = {
  TEXT,
  SIMPLE_LIST,
  KEY_VALUE_LIST,
  MD,
  MD_WORD
} as const;

export const OUTPUT_TYPE = {
  TEXT: 'TEXT',
  SIMPLE_LIST: 'SIMPLE_LIST',
  KEY_VALUE_LIST: 'KEY_VALUE_LIST',
  MD: 'MD'
} as const;

export function assemblePrompt(rulePrompt: string, outputPrompt: string): string {
  return `${rulePrompt}\n\n${outputPrompt}`
}

export function contextMessages(input: string, before?: string, after?: string,): ChatCompletionMessageParam[] {
  return [
    before ? { role: "user", content: `<<CONTEXT_BEFORE>>\n${before}` } : undefined,
    after ? { role: "user", content: `<<CONTEXT_AFTER>>\n${after}` } : undefined,
    { role: "user", content: `<<INPUT>>\n${input}` },
  ].filter(Boolean) as ChatCompletionMessageParam[]
}