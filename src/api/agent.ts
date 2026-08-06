import { useSettingStore } from '@/store'
import { streamAgentProcess, type AgentStreamOptions } from '@/utils/stream/agent'

/**
 * Agent 可用工具 schema（OpenAI function 格式）。
 * 随 enableTools: true 一并发送给 /agent-process。
 */
export const AGENT_TOOL_DEFINITIONS: AgentApi.ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_article_word_count',
      description: '根据文章 ID 查询该篇 Markdown 正文的字数（去空白后的字符数）。用户询问字数、篇幅、有多少字时使用。',
      parameters: {
        type: 'object',
        properties: {
          article_id: {
            type: 'number',
            description: '文章 ID，通常使用当前绑定文档的 articleId',
          },
        },
        required: ['article_id'],
      },
    },
  },
]

export interface initRequest {
  mode: Agent.Mode
  messages: AgentApi.Message[]
  initialContext?: Agent.initialContext | null
  /** 为 true 时在请求体中携带 AGENT_TOOL_DEFINITIONS */
  enableTools?: boolean
}

/** 组装 Agent 专用请求体 */
export function buildInitialRequest(params: initRequest): AgentApi.CompletionRequest {
  const settingStore = useSettingStore()

  const request: AgentApi.CompletionRequest = {
    mode: params.mode,
    model: settingStore.modelName,
    messages: params.messages,
    documentContext: params.initialContext
      ? {
          articleId: params.initialContext.articleId,
          title: params.initialContext.title,
          content: params.initialContext.content,
          groupId: params.initialContext.groupId,
          groupName: params.initialContext.groupName,
          capturedAt: params.initialContext.capturedAt,
        }
      : null,
    temperature: settingStore.temperature,
    top_p: settingStore.top_p,
    extra_body: {
      thinking: { type: 'enabled' },
    },
    // TODO：思考力度可配置
    reasoning_effort: 'high',
    stream: true,
  }

  if (params.enableTools)
    request.tools = AGENT_TOOL_DEFINITIONS

  return request
}

/** 发起 Agent SSE 流式对话 */
export function streamAgentCompletion(
  request: AgentApi.CompletionRequest,
  options: AgentStreamOptions,
) {
  return streamAgentProcess(request, options)
}

/** 便捷方法：由 store 传入 messages 后直接流式请求 */
export function streamAgentTurn(
  params: initRequest,
  options: AgentStreamOptions,
) {
  const request = buildInitialRequest(params)
  return streamAgentCompletion(request, options)
}
