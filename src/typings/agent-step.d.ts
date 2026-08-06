/**
 * Agent Step 扁平模型
 *
 * - Session.steps 为线性数组；每条 Step 带 index
 * - 发请求前 steps 列表由 store / 视图层准备好（线性追加、回溯截断等）
 * - 请求层仅：system prompt + steps → messages，不做额外处理
 */
declare namespace AgentStep {

  interface ToolCall {
    id: string
    type: 'function'
    function: {
      name: string
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
    content: string
  }

  type ApiMessage = UserMessage | AssistantMessage | ToolMessage

  type FinishReason = 'stop' | 'tool_calls' | 'length' | 'content_filter' | null

  type Mode = 'agent' | 'ask'

  interface StepIndex {
    index: number
  }

  type UserStep = UserMessage & StepIndex

  type AssistantStatus = 'streaming' | 'done' | 'error'

  interface AssistantStep extends AssistantMessage, StepIndex {
    status: AssistantStatus
    error?: string
  }

  type ToolStatus = 'running' | 'done' | 'error'

  interface ToolStep extends ToolMessage, StepIndex {
    status: ToolStatus
    msg?: string
    error?: string
  }

  type Step = UserStep | AssistantStep | ToolStep

  interface InitialContext {
    articleId: number
    title: string
    content: string
    groupId: string
    groupName: string
    capturedAt: string
  }

  interface Running {
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

  interface StreamTurnResult {
    message: AssistantMessage
    finishReason: FinishReason
  }

  interface ToolExecuteResult {
    payload: Record<string, unknown>
    msg?: string
  }

  interface ToolRegistryEntry {
    msgFromArgs?: (args: Record<string, unknown>, ctx: InitialContext | null) => string
    execute: (args: Record<string, unknown>) => ToolExecuteResult
  }

}
