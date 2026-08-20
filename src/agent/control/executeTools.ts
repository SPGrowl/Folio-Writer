import { AGENT_TOOL_REGISTRY, isArticleWriteTool } from '@/agent/tool'
import { buildToolMsg, formatDoneSlot } from '@/agent/tool/display'
import { useAgentStore, useComposeTabStore } from '@/store'
import { safeParseToolArgs } from './parseToolArgs'

function resolveToolError(error: unknown): string {
  if (error instanceof Error)
    return error.message
  return String(error)
}

/** 从已完成的 AssistantStep 派生并执行 ToolStep */
export async function executeToolStepsFromAssistant(
  assistant: AgentStep.AssistantStep,
  signal: AbortSignal,
) {
  const store = useAgentStore()
  const tabStore = useComposeTabStore()
  const ctx = store.activeSession?.documentContext ?? null
  const sessionId = store.activeSession?.id

  for (const tc of assistant.tool_calls ?? []) {
    if (signal.aborted)
      break

    const toolName = tc.function.name
    const entry = AGENT_TOOL_REGISTRY[toolName]
    const args = safeParseToolArgs(tc.function.arguments)

    const toolStep = store.pushToolStep(tc.id, '', {
      status: 'running',
      msg: buildToolMsg(toolName, args, ctx),
      toolName,
      ...(isArticleWriteTool(toolName) ? { reviewStatus: 'pending' as const } : {}),
    })
    if (!toolStep)
      break

    store.setRunning({ stepIndex: toolStep.index, phase: 'tool_running' })

    if (signal.aborted)
      break

    if (!entry) {
      store.patchStepAt(toolStep.index, {
        status: 'error',
        error: `未知工具：${toolName}`,
      })
      continue
    }

    try {
      const result = await Promise.resolve(entry.execute(args))

      if (isArticleWriteTool(toolName) && result.meta && sessionId != null) {
        tabStore.applyAgentChanges(result.meta.articleId, result.meta.content, {
          sourceToolStepIndex: toolStep.index,
          sourceSessionId: sessionId,
        })
      }

      store.patchToolMsgSlot(
        toolStep.index,
        'done',
        formatDoneSlot(toolName, args, ctx, result),
      )
      store.patchStepAt(toolStep.index, {
        status: 'done',
        content: JSON.stringify(result.payload),
        ...(isArticleWriteTool(toolName)
          ? { reviewStatus: 'pending' as const }
          : {}),
      })
    }
    catch (error) {
      store.patchStepAt(toolStep.index, {
        status: 'error',
        error: resolveToolError(error),
      })
    }
  }
}
