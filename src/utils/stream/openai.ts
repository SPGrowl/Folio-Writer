import { useAuthStore } from '@/store'
import { parseOpenAIStream } from './parseOpenAIStream'

/** SSE 流式请求选项 */
export interface StreamChatOptions {
  signal?: AbortSignal
  onChunk: (delta: OpenAI.StreamDelta) => void
  onError?: (message: string) => void
  onDone?: () => void
}

/**
 * 使用 fetch + ReadableStream 解析后端转发的 OpenAI SSE 流。
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

  await parseOpenAIStream(res.body, {
    onChunk({ delta, errorMessage }) {
      if (errorMessage) {
        options.onError?.(errorMessage)
        return
      }
      if (delta)
        options.onChunk(delta as OpenAI.StreamDelta)
    },
    onError: options.onError,
    onDone: options.onDone,
  })
}
