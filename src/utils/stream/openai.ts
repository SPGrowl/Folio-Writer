import { useAuthStore } from '@/store'

/** SSE 流式请求选项 */
// 与包装后的request一同通过fetch发送给后端
export interface StreamChatOptions {
  // 该异步任务对应的信号，可以用AbortController来终止
  signal?: AbortSignal
  /** 每收到一个 delta 分片时回调 */
  onChunk: (delta: OpenAI.StreamDelta) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/**
 * 使用 fetch + ReadableStream 解析后端转发的 OpenAI SSE 流。
 * 替代旧版 axios onDownloadProgress + chatgpt 自定义 JSON 行协议。
 */
export async function streamChatProcess(
  body: OpenAI.OpenAIRequest,
  options: StreamChatOptions,
) {
  const authStore = useAuthStore()
  const baseURL = import.meta.env.VITE_GLOB_API_URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authStore.token)
    headers.Authorization = `Bearer ${authStore.token}`

  // 通过fetch，将请求体带给后端
  const res = await fetch(`${baseURL}/chat-process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  })

  // 如果请求失败，则抛出错误
  if (!res.ok || !res.body)
    throw new Error(`stream request failed: ${res.status}`)

  const reader = res.body.getReader()
  // 解析为UTF8
  const decoder = new TextDecoder()
  let buffer = ''

  // 流只负责按序、不丢、不重复地交付原始字节，需要自行拼接和解析SSE
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    // 将读出的字节流追加到buffer（buffre可能包含上一次SSE分片的未完成内容）
    buffer += decoder.decode(value, { stream: true })

    // 取出完整的SSE事件
    const parts = buffer.split('\n\n')
    // 弹出末尾不完整的SSE事件
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.trim()
      // 如果不是以SSE分片开头，则跳过
      if (!line.startsWith('data:'))
        continue

      // 去掉data:前缀
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') {
        options.onDone?.()
        return
      }

      const chunk = JSON.parse(payload) as OpenAI.StreamChunk
      if (chunk.error?.message) {
        options.onError?.(chunk.error.message)
        return
      }

      const delta = chunk.choices?.[0]?.delta
      if (delta)
        options.onChunk(delta)
    }
  }

  options.onDone?.()
}
