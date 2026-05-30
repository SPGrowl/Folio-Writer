declare namespace OpenAI {
  /** 发往 /chat-process 的请求体，对齐 OpenAI Chat Completions API */
  export interface OpenAIRequest {
    model: string
    messages: Message[]
    temperature?: number
    top_p?: number
    extra_body?: ExtraBody
    reasoning_effort?: 'high' | 'max'
    stream: boolean
  }

  export interface Message {
    role: 'user' | 'assistant' | 'system'
    content: string
  }

  export interface ExtraBody {
    thinking?: { type: 'enabled' | 'disabled' }
  }

  /** 流式分片中的 delta 字段（含 DeepSeek reasoning_content） */
  export interface StreamDelta {
    content?: string | null
    reasoning_content?: string | null
    role?: string
  }

  /** SSE 中单条 data 事件的 JSON 结构 */
  export interface StreamChunk {
    choices?: Array<{
      delta?: StreamDelta
      finish_reason?: string | null
    }>
    error?: { message: string }
  }
}
