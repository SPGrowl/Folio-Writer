import { useAuthStore } from '@/store'

export interface AgentStreamOptions {
  signal?: AbortSignal
  onChunk: (delta: AgentApi.StreamDelta, meta: AgentApi.StreamChunkMeta) => void
  onError?: (message: string) => void
  onDone?: (meta: AgentApi.StreamChunkMeta) => void
}

/**
 * Agent 专用 SSE 流解析：透传 finish_reason，支持 tool_calls 分片。
 * 与 chat 的 streamChatProcess 分离，便于后续扩展 agent loop。
 */
// 解析流
export async function streamAgentProcess(
  body: AgentApi.CompletionRequest,
  options: AgentStreamOptions,
) {
  const authStore = useAuthStore()
  const baseURL = import.meta.env.VITE_GLOB_API_URL
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authStore.token)
    headers.Authorization = `Bearer ${authStore.token}`

  const res = await fetch(`${baseURL}/agent-process`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!res.ok || !res.body)
    throw new Error(`agent stream request failed: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let lastFinishReason: AgentApi.FinishReason = null

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:'))
        continue

      const payload = line.slice(5).trim()
      if (payload === '[DONE]') {
        options.onDone?.({ finishReason: lastFinishReason })
        return
      }

      const chunk = JSON.parse(payload) as AgentApi.StreamChunk
      if (chunk.error?.message) {
        options.onError?.(chunk.error.message)
        return
      }

      const choice = chunk.choices?.[0]
      const finishReason = choice?.finish_reason ?? null
      if (finishReason != null)
        lastFinishReason = finishReason

      const meta: AgentApi.StreamChunkMeta = { finishReason }
      const delta = choice?.delta
      if (delta)
        options.onChunk(delta, meta)
    }
  }

  options.onDone?.({ finishReason: lastFinishReason })
}
