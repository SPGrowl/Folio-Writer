import { useAuthStore } from '@/store'

/** SSE 流式请求选项 */
export interface StreamChatOptions {
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

  const res = await fetch(`${baseURL}/chat-process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!res.ok || !res.body)
    throw new Error(`stream request failed: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    buffer += decoder.decode(value, { stream: true })

    // SSE 事件以空行分隔
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:'))
        continue

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
