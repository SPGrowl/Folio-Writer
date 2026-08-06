import { safeParseToolArgs } from './parseToolArgs'

export interface ToolDraft {
  tc: AgentApi.ToolCall
  msg: string
}

/** 从 done 后的 AssistantStep 派生 ToolStep 草稿（暂不查 registry） */
export function deriveToolDrafts(
  assistant: AgentStep.AssistantStep,
  ctx: AgentStep.InitialContext | null,
): ToolDraft[] {
  return (assistant.tool_calls ?? []).map((tc) => ({
    tc,
    msg: deriveToolMsg(tc, ctx),
  }))
}

function deriveToolMsg(
  tc: AgentApi.ToolCall,
  ctx: AgentStep.InitialContext | null,
): string {
  if (ctx?.title)
    return `《${ctx.title}》`

  const args = safeParseToolArgs(tc.function.arguments)
  const title = args.title
  if (typeof title === 'string' && title.trim())
    return `《${title.trim()}》`

  return tc.function.name
}

/** 工具占位执行：control 层 loop 用，具体实现后续接入 registry */
export async function executeToolStub(
  tc: AgentApi.ToolCall,
): Promise<AgentStep.ToolExecuteResult> {
  const args = safeParseToolArgs(tc.function.arguments)

  return {
    payload: {
      tool: tc.function.name,
      arguments: args,
      stub: true,
    },
  }
}
