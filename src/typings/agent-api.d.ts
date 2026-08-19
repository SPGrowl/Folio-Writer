declare namespace AgentApi {

  type Mode = 'agent' | 'ask'

  /** 发往 /agent-process 的文档上下文（仅元数据，不含正文） */
  interface DocumentContextPayload {
    articleId: number
    title: string
    groupId: string
    groupName: string
    capturedAt?: string
  }

  interface ToolFunction {
    name: string
    description: string
    parameters: Record<string, unknown>
  }

  /** OpenAI tools 定义（预留，现阶段可不传） */
  interface ToolDefinition {
    type: 'function'
    function: ToolFunction
  }

  interface ToolCall {
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }

  /** Agent 对话消息（扩展 OpenAI，支持 tool 回放） */
  interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    reasoning_content?: string
    tool_calls?: ToolCall[]
    tool_call_id?: string
  }

  /** 发往 /agent-process 的请求体 */
  interface CompletionRequest {
    mode: Mode
    model: string
    messages: Message[]
    documentContext?: DocumentContextPayload | null
    /** 预留：启用后传给上游 tools */
    tools?: ToolDefinition[]
    temperature?: number
    top_p?: number
    extra_body?: {
      thinking?: { type: 'enabled' | 'disabled' }
    }
    reasoning_effort?: 'low' | 'high' | 'max'
    stream: true
  }

  /** 流式 delta 中的 tool_calls 分片 */
  interface ToolCallDelta {
    index?: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }

  /** SSE chunk 中的 delta */
  interface StreamDelta {
    role?: string
    content?: string | null
    reasoning_content?: string | null
    tool_calls?: ToolCallDelta[]
  }

  type FinishReason = 'stop' | 'tool_calls' | 'length' | 'content_filter' | null

  /** 随 onChunk / onDone 传递的 chunk 元信息 */
  interface StreamChunkMeta {
    finishReason: FinishReason
  }

  /** SSE 单条 data 事件解析结果 */
  interface StreamChunk {
    id?: string
    object?: string
    choices?: Array<{
      index?: number
      delta?: StreamDelta
      finish_reason?: FinishReason
    }>
    error?: { message: string }
  }
}
                                                          trt