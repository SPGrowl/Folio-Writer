import { AGENT_TOOL_REGISTRY } from '@/agent/tool'
import { t } from '@/locales'
import { useAgentStore } from '@/store'
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
  const ctx = store.activeSession?.documentContext ?? null

  for (const tc of assistant.tool_calls ?? []) {
    if (signal.aborted)
      break

    const entry = AGENT_TOOL_REGISTRY[tc.function.name]
    const args = safeParseToolArgs(tc.function.arguments)
    const msg = entry?.msgFromArgs?.(args, ctx)
      ?? fallbackToolMsg(tc.function.name, args, ctx)

    const toolStep = store.pushToolStep(tc.id, '', {
      status: 'running',
      msg,
    })
    if (!toolStep)
      break

    store.setRunning({ stepIndex: toolStep.index, phase: 'tool_running' })

    if (signal.aborted)
      break

    if (!entry) {
      store.patchStepAt(toolStep.index, {
        status: 'error',
        error: `未知工具：${tc.function.name}`,
        msg,
      })
      continue
    }

    try {
      const { payload, msg: resultMsg } = entry.execute(args)
      store.patchStepAt(toolStep.index, {
        status: 'done',
        content: JSON.stringify(payload),
        msg: resultMsg ?? msg,
      })
    }
    catch (error) {
      store.patchStepAt(toolStep.index, {
        status: 'error',
        error: resolveToolError(error),
        msg,
      })
    }
  }
}
