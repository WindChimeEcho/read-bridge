import CardComponent from "@/app/components/common/CardComponent"
import { OUTPUT_TYPE } from "@/constants/prompt"
import { Collapse } from "antd"
import { LoadingOutlined } from "@ant-design/icons"
import { useCallback, useEffect, useState } from "react"
import ChatMarkdownWrapper from "@/app/components/common/ChatMarkdownWrapper"
import { CacheItemValue, SentenceProcessing } from "@/types/cache"

import { cacheService } from "@/services/CacheService"

// 内容质量验证函数 - 使用OR逻辑：文本或列表满足其中一个条件即可
function shouldCache(text: string, list: string[]): boolean {
  // 检查文本是否有效
  const hasValidText = text && text.trim().length >= 5

  // 检查列表是否有效
  const hasValidList = list && list.length > 0 && list.some(item => item.trim().length >= 3)

  // 文本或列表满足其中一个条件即可
  return hasValidText || hasValidList
}

// 自定义hook抽取think处理逻辑
function useThinkGenerator(SentenceProcessing: SentenceProcessing, outputType: 'text' | 'list') {
  const { generator, signal, bookId } = SentenceProcessing  // 解构获取signal和bookId
  const [text, setText] = useState<string>("")
  const [list, setList] = useState<string[]>([])
  const [thinkContext, setThinkContext] = useState<string>('')

  useEffect(() => {
    setText("");
    setList([]);
    setThinkContext('')

    handleThinkAndResult(
      generator,
      outputType === 'text' ? (value) => setText((prev) => prev + value) : (value) => setList((prev) => [...prev, value]),
      (value) => setThinkContext((prev) => prev + value),
      signal  // 传递signal
    ).then(({ completed, hasContent, thinkComplete }) => {
      // 只有在请求完成且内容有效时才缓存
      if (completed && hasContent && thinkComplete) {
        // 获取最新状态进行缓存判断
        setText(currentText => {
          setList(currentList => {
            setThinkContext(currentThinkContext => {
              if (shouldCache(currentText, currentList)) {
                const { id, type, text: sentence, fromCache } = SentenceProcessing
                if (!fromCache) {
                  cacheService.set(
                    {
                      bookId: bookId || '',
                      sentence,
                      ruleId: id
                    },
                    {
                      type: type,
                      ...(currentThinkContext.length > 0 ? { thinkContext: currentThinkContext } : {}),
                      ...(currentText.length > 0
                        ? { result: currentText }
                        : { resultArray: currentList })
                    } as CacheItemValue
                  )
                }
              }
              return currentThinkContext
            })
            return currentList
          })
          return currentText
        })
      }
    }).catch(error => {
      // 处理错误，不缓存
      console.error('Generator failed:', error)
    })
  }, [generator, signal, outputType, SentenceProcessing, bookId])  // 依赖中添加bookId

  return { text, list, thinkContext }
}

export default function Sentences({ sentenceProcessingList }: {
  sentenceProcessingList:
  SentenceProcessing[]
}) {
  return (
    <div className="w-full flex-1 min-h-0 p-4 overflow-y-auto">
      {
        sentenceProcessingList.map((item) => {
          return (
            item.type === OUTPUT_TYPE.MD ? <MDGenerator className="mb-2" SentenceProcessing={item} key={item.id} /> :
              <CardComponent className="mb-2" key={item.id} title={item.name} loading={!item}>
                {
                  item.type === OUTPUT_TYPE.TEXT ? <TextGenerator SentenceProcessing={item} /> :
                    item.type === OUTPUT_TYPE.SIMPLE_LIST ? <SimpleListGenerator SentenceProcessing={item} /> :
                      item.type === OUTPUT_TYPE.KEY_VALUE_LIST ? <KeyValueListGenerator SentenceProcessing={item} /> :
                        null
                }
              </CardComponent>
          )
        })
      }
    </div>
  )
}

function TextGenerator({ SentenceProcessing }: { SentenceProcessing: SentenceProcessing }) {
  const { text, thinkContext } = useThinkGenerator(SentenceProcessing, 'text')

  return <div>
    <ThinkCollapse thinkContext={thinkContext} />
    {text.length === 0 && <LoadingOutlined />}
    <div>{text}</div>
  </div>
}

function ListGenerator({ SentenceProcessing, type }: { SentenceProcessing: SentenceProcessing, type: string }) {
  const handleWordAnalysis = useCallback((analysis: string, index: number) => {
    const [keyWord, ...rest] = analysis.split(':')
    return <div className="text-[var(--ant-color-text)] mb-2" key={index}><span className=" font-semibold">{keyWord}</span>:{rest}</div>
  }, [])

  const { list, thinkContext } = useThinkGenerator(SentenceProcessing, 'list')

  return (
    <div>
      <ThinkCollapse thinkContext={thinkContext} />
      {list.length === 0 && <LoadingOutlined />}
      {type === OUTPUT_TYPE.KEY_VALUE_LIST
        ? list.map((item, index) => handleWordAnalysis(item, index))
        : list.map((item) => <div key={item}>{item}</div>)
      }
    </div>
  )
}

async function handleThinkAndResult(
  generator: AsyncGenerator<string, void, unknown>,
  onValue: (value: string) => void,
  onThinkContext: (value: string) => void,
  signal?: AbortSignal
): Promise<{ completed: boolean, hasContent: boolean, thinkComplete: boolean }> {
  let thinking: boolean = false;
  let hasThinkTag = false;
  let contentLength = 0;
  let thinkContentLength = 0;

  try {
    // 在开始前检查是否已经被中断
    if (signal?.aborted) {
      console.log('Generator already aborted before start')
      return { completed: false, hasContent: false, thinkComplete: false };
    }

    for await (const chunk of generator) {
      if (chunk === '<think>') {
        thinking = true;
        hasThinkTag = true;
        continue;
      }
      if (thinking) {
        if (chunk === '</think>') {
          thinking = false;
          continue;
        }
        onThinkContext(chunk);
        thinkContentLength += chunk.length;
      } else {
        onValue(chunk);
        contentLength += chunk.length;
      }
    }

    // 循环正常结束后，再次检查是否被中断
    if (signal?.aborted) {
      console.log('Generator was aborted during execution')
      return { completed: false, hasContent: false, thinkComplete: false };
    }

    const hasContent = contentLength > 5;
    const thinkComplete = !hasThinkTag || (!thinking && thinkContentLength > 0);

    return {
      completed: true,
      hasContent,
      thinkComplete
    };

  } catch (error) {
    // 检查是否是中断错误
    if ((error as Error)?.name === 'AbortError' || signal?.aborted) {
      console.log('Generator was aborted:', error)
      return { completed: false, hasContent: false, thinkComplete: false };
    }

    console.log('Generator failed with error:', error)
    return { completed: false, hasContent: false, thinkComplete: false };
  }
}

function SimpleListGenerator({ SentenceProcessing }: { SentenceProcessing: SentenceProcessing }) {
  return <ListGenerator SentenceProcessing={SentenceProcessing} type={OUTPUT_TYPE.SIMPLE_LIST} />
}

function KeyValueListGenerator({ SentenceProcessing }: { SentenceProcessing: SentenceProcessing }) {
  return <ListGenerator SentenceProcessing={SentenceProcessing} type={OUTPUT_TYPE.KEY_VALUE_LIST} />
}

function ThinkCollapse({ thinkContext }: { thinkContext: string }) {
  if (!thinkContext) return null;
  return (
    <Collapse
      size="small"
      ghost
      className="[&_.ant-collapse-header]{padding:0}"
      items={[{ key: '1', label: 'think', children: <p>{thinkContext}</p> }]}
    />
  );
}

function MDGenerator({ SentenceProcessing, className }: { SentenceProcessing: SentenceProcessing, className?: string }) {
  const { text, thinkContext } = useThinkGenerator(SentenceProcessing, 'text')
  return <CardComponent className={className}>
    <ThinkCollapse thinkContext={thinkContext} />
    <ChatMarkdownWrapper content={text} className="min-h-[180px]" />
  </CardComponent>
}

