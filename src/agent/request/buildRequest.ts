import { useSettingStore } from '@/store'
import { AGENT_TOOL_DEFINITIONS } from '@/agent/tool'
import { buildSystemPrompt } from './prompt'

/** Step → API message（strip index / status / msg / error） */
function stepToApiMessage(step: AgentStep.Step): AgentApi.Message {
  if (step.role === 'user')
    return { role: 'user', content: step.content }

  if (step.role === 'assistant') {
    const message: AgentApi.Message = {
      role: 'assistant',
      content: step.content ?? '',
    }
    if (step.reasoning_content)
      message.reasoning_content = step.reasoning_content
    if (step.tool_calls?.length)
      message.tool_calls = step.tool_calls
    return message
  }

  return {
    role: 'tool',
    tool_call_id: step.tool_call_id,
    content: step.content,
  }
}

/**
 * 请求层唯一出口：按 mode 贴 system，将 store 已准备好的 steps 转为 messages。
 * 线性 / 回溯 / index 校正由 store 在调用前完成。
 */
export function buildRequest(session: AgentStep.Session): AgentApi.CompletionRequest {
  const settingStore = useSettingStore()

  const request: AgentApi.CompletionRequest = {
    mode: session.mode,
    model: settingStore.modelName,
    messages: [
      { role: 'system', content: buildSystemPrompt(session) },
      ...session.steps.map(stepToApiMessage),
    ],
    documentContext: session.documentContext
      ? {
          articleId: session.documentContext.articleId,
          title: session.documentContext.title,
          content: session.documentContext.content,
          groupId: session.documentContext.groupId,
          groupName: session.documentContext.groupName,
          capturedAt: session.documentContext.capturedAt,
        }
      : null,
    temperature: settingStore.temperature,
    top_p: settingStore.top_p,
    extra_body: {
      thinking: { type: 'enabled' },
    },
    reasoning_effort: 'high',
    stream: true,
  }

  if (session.mode === 'agent')
    request.tools = AGENT_TOOL_DEFINITIONS

  return request
}
