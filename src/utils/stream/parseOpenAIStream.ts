/** 单条 SSE data 事件解析结果 */
export interface ParsedStreamChunk {
  delta?: AgentApi.StreamDelta
  finishReason?: AgentApi.FinishReason
  errorMessage?: string
}

export interface ParseOpenAIStreamOptions {
  onChunk: (chunk: ParsedStreamChunk) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/**
 * 解析 OpenAI 兼容 SSE 流（chat-process / agent-process 共用）。
 * 按事件交付 delta、finish_reason 与 error。
 */
export async function parseOpenAIStream(
  body: ReadableStream<Uint8Array>,
  options: ParseOpenAIStreamOptions,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    buffer += decoder.decode(value, { stream: true })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const payload = extractDataPayload(part)
      if (payload == null)
        continue

      if (payload === '[DONE]') {
        options.onDone?.()
        return
      }

      let chunk: AgentApi.StreamChunk
      try {
        chunk = JSON.parse(payload) as AgentApi.StreamChunk
      }
      catch {
        continue
      }

      if (chunk.error?.message) {
        options.onError?.(chunk.error.message)
        options.onChunk({ errorMessage: chunk.error.message })
        return
      }

      const choice = chunk.choices?.[0]
      options.onChunk({
        delta: choice?.delta,
        finishReason: choice?.finish_reason ?? undefined,
      })
    }
  }

  options.onDone?.()
}

function extractDataPayload(eventBlock: string): string | null {
  const line = eventBlock
    .split('\n')
    .map(item => item.trim())
    .find(item => item.startsWith('data:'))

  if (!line)
    return null

  return line.slice(5).trim()
}
