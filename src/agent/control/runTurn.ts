import { buildRequest, streamOneTurn } from '@/agent/request'
import { useAgentStore } from '@/store'
import { executeToolStepsFromAssistant } from './executeTools'

function resolveStreamError(error: unknown): string {
  if (error instanceof Error)
    return error.message
  return String(error)
}

function finalizeStreamingAssistant(store: ReturnType<typeof useAgentStore>, index: number) {
  const step = store.activeSteps[index]
  if (step?.role === 'assistant' && step.status === 'streaming')
    store.patchStepAt(index, { status: 'done' })
}

/** Agent 子循环：单次 HTTP 流 → 可选工具占位 → 直至段结束 */
export async function runTurn(signal: AbortSignal) {
  const store = useAgentStore()
  let lastAssistantIndex: number | null = null

  try {
    while (!signal.aborted) {
      const session = store.activeSession
      if (!session)
        break

      const assistantStep = store.pushAssistantStep({ status: 'streaming' })
      if (!assistantStep)
        break

      const assistantIndex = assistantStep.index
      lastAssistantIndex = assistantIndex
      store.setRunning({ stepIndex: assistantIndex, phase: 'streaming' })

      let result: AgentStep.StreamTurnResult
      try {

        // 等待一条完整的助手消息
        result = await streamOneTurn(buildRequest(session), {
          signal,
          // 更新助手端的信息
          onPatch: patch => store.patchStepAt(assistantIndex, patch),
        })
      }
      catch (error) {
        if (signal.aborted)
          break

        store.patchStepAt(assistantIndex, {
          status: 'error',
          error: resolveStreamError(error),
        })
        break
      }

      if (signal.aborted)
        break

      store.patchStepAt(assistantIndex, {
        ...result.message,
        status: 'done',
      })

      const needsTools =
        result.finishReason === 'tool_calls'
        && (result.message.tool_calls?.length ?? 0) > 0

      if (!needsTools)
        break

      if (signal.aborted || !store.isRunning)
        break

      const finalized = store.activeSteps[assistantIndex]
      if (!finalized || finalized.role !== 'assistant')
        break

      // 派生并执行工具调用
      await executeToolStepsFromAssistant(finalized, signal)
    }
  }
  finally {
    if (signal.aborted && lastAssistantIndex != null)
      finalizeStreamingAssistant(store, lastAssistantIndex)

    if (!signal.aborted)
      store.setRunning(null)
  }
}
