import { useAuthStore } from '@/store'
import { parseOpenAIStream } from '@/utils/stream/parseOpenAIStream'
import { AssistantAccumulator } from './accumulate'

export interface StreamAgentTurnOptions {
  signal?: AbortSignal
  onPatch: (patch: Partial<AgentStep.AssistantStep>) => void
}

/** POST /agent-process 并解析 SSE，返回完整 assistant 消息 */
export async function streamOneTurn(
  body: AgentApi.CompletionRequest,
  options: StreamAgentTurnOptions,
): Promise<AgentStep.StreamTurnResult> {
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
    throw new Error(`agent stream failed: ${res.status}`)

  const acc = new AssistantAccumulator()
  let finishReason: AgentApi.FinishReason = null
  let streamError: string | null = null

  try {
    await parseOpenAIStream(res.body, {
      onChunk({ delta, finishReason: reason, errorMessage }) {
        if (errorMessage) {
          streamError = errorMessage
          return
        }
        if (reason != null)
          finishReason = reason
        if (!delta)
          return

        acc.apply(delta)
        options.onPatch(acc.getDisplayPatch())
      },
      onError(message) {
        streamError = message
      },
    })
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error
    throw error instanceof Error ? error : new Error(String(error))
  }

  if (streamError)
    throw new Error(streamError)

  return {
    message: acc.finalize(),
    finishReason,
  }
}
