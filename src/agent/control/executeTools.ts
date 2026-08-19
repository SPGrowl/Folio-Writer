import { AGENT_TOOL_REGISTRY } from '@/agent/tool'
import { t } from '@/locales'
import { useAgentStore, useComposeTabStore } from '@/store'
import { safeParseToolArgs } from './parseToolArgs'

function fallbackToolMsg(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  if (ctx?.title)
    return `《${ctx.title}》`

  const raw = args.article_id ?? args.articleId
  if (raw != null)
    return `文章 ${raw}`

  return toolName || t('compose.agent.toolDefaultTarget')
}

function fallbackRunningMsg(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.toolRunning', {
    target: fallbackToolMsg(toolName, args, ctx),
  })
}

function fallbackErrorMsg(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.toolError', {
    target: fallbackToolMsg(toolName, args, ctx),
  })
}

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
    const runningMsg = entry?.formatRunning(args, ctx)
      ?? fallbackRunningMsg(toolName, args, ctx)

    const toolStep = store.pushToolStep(tc.id, '', {
      status: 'running',
      msg: runningMsg,
      toolName,
      ...(toolName === 'update_article_content' ? { reviewStatus: 'pending' as const } : {}),
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
        msg: fallbackErrorMsg(toolName, args, ctx),
      })
      continue
    }

    try {
      const result = await Promise.resolve(entry.execute(args))

      if (toolName === 'update_article_content' && result.meta && sessionId != null) {
        tabStore.applyAgentChanges(result.meta.articleId, result.meta.content, {
          sourceToolStepIndex: toolStep.index,
          sourceSessionId: sessionId,
        })
      }

      store.patchStepAt(toolStep.index, {
        status: 'done',
        content: JSON.stringify(result.payload),
        msg: entry.formatDone(args, result),
        ...(toolName === 'update_article_content'
          ? { reviewStatus: 'pending' as const }
          : {}),
      })
    }
    catch (error) {
      const errorText = resolveToolError(error)
      store.patchStepAt(toolStep.index, {
        status: 'error',
        error: errorText,
        msg: entry.formatError?.(args, ctx, errorText)
          ?? fallbackErrorMsg(toolName, args, ctx),
      })
    }
  }
}
