/**
 * Agent Step 扁平模型
 *
 * - Session.steps 为线性数组，下标即 step index，无 Turn / StepMeta
 * - 每个 Step 以 OpenAI Chat Completions message 为基底，仅加少量运行时字段
 * - 工具名、参数：从 assistant.tool_calls[].function 派生，流式拼好后本地 parse 映射
 * - UI 工具展示 = 单行字符串 msg；content 专供 LLM（JSON.stringify(payload)），拼 API 时 strip
 */
declare namespace AgentStep {

  // ---------------------------------------------------------------------------
  // OpenAI Chat Completions message（协议形态）
  // ---------------------------------------------------------------------------

  interface ToolCall {
    id: string
    type: 'function'
    function: {
      name: string
      /** JSON 字符串；流式阶段逐步拼接，done 后 parse 映射 UI */
      arguments: string
    }
  }

  interface UserMessage {
    role: 'user'
    content: string
  }

  interface AssistantMessage {
    role: 'assistant'
    content?: string
    reasoning_content?: string
    tool_calls?: ToolCall[]
  }

  interface ToolMessage {
    role: 'tool'
    tool_call_id: string
    /** 回传 LLM，通常为 JSON.stringify(payload) */
    content: string
  }

  type ApiMessage = UserMessage | AssistantMessage | ToolMessage

  type FinishReason = 'stop' | 'tool_calls' | 'length' | 'content_filter' | null

  // ---------------------------------------------------------------------------
  // Step = message + 运行时（strip 后即为 ApiMessage）
  // ---------------------------------------------------------------------------

  type Mode = 'agent' | 'ask'

  /** 用户输入 */
  type UserStep = UserMessage

  /**
   * LLM 一步
   * 流式：写入 streaming.*，done 后 merge 到顶层字段并清除 streaming
   * 含 tool_calls 时，name/arguments 即工具运行时信息的唯一来源
   */
  interface AssistantStep extends AssistantMessage {
    error?: string
  }

  /**
   * 工具执行一步
   * name 不存字段：用 tool_call_id 回查前序 assistant.tool_calls[].function.name
   * msg：UI 单行文案，execute 前「正在…」/ 完成后结果；拼 API 时 strip
   */
  interface ToolStep extends ToolMessage {
    msg?: string
    error?: string
  }

  type Step = UserStep | AssistantStep | ToolStep

  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------

  interface InitialContext {
    articleId: number
    title: string
    content: string
    groupId: string
    groupName: string
    capturedAt: string
  }

  interface Running {
    sessionId: number
    /** 正在写入的 step 下标 */
    stepIndex: number
    phase: 'streaming' | 'tool_running'
  }

  interface Session {
    id: number
    title: string
    mode: Mode
    documentContext: InitialContext | null
    steps: Step[]
    createTime: string
  }

  interface State {
    sessions: Session[]
    activeSessionId: number | null
    running: Running | null
  }

  // ---------------------------------------------------------------------------
  // 工具层 / 请求层锚点（实现置于对应模块）
  // ---------------------------------------------------------------------------

  interface StreamTurnResult {
    message: AssistantMessage
    finishReason: FinishReason
  }

  interface ToolExecuteResult {
    payload: Record<string, unknown>
    /** 人类可读结果文案，写入 ToolStep.msg；缺省由 UI 从 payload 派生 */
    msg?: string
  }

  interface ToolRegistryEntry {
    /** 从完整 arguments 生成「正在执行…」文案（done 或 render 时调用） */
    msgFromArgs?: (args: Record<string, unknown>, ctx: InitialContext | null) => string
    execute: (args: Record<string, unknown>) => ToolExecuteResult
  }

}
