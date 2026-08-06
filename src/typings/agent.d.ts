declare namespace Agent {

  type Mode = 'agent' | 'ask'

  type RunStatus = 'idle' | 'streaming' | 'tool_running' | 'done' | 'error'

  type ToolStatus = 'calling' | 'done' | 'failed'

  /** 首轮发送时冻结的文档上下文（含文章与分组） */
  interface initialContext {
    articleId: number
    title: string
    content: string
    groupId: string
    groupName: string
    capturedAt: string
  }

  /** 工具调用 UI 记录 */
  interface ToolInvocation {
    id: string
    name: string
    displayName: string
    status: ToolStatus
    paramsSummary: string
    resultSummary?: string
    error?: string
    // 副作用
    sideEffect?: {
      type: 'document_updated'
      articleTitle: string
    }
  }

  interface UserMessage {
    role: 'user'
    text: string
    dateTime: string
  }

  /** Turn 内部的单步 agent 子循环 */
  interface RunStep {
    stepIndex: number
    reasoning?: string
    invocations: ToolInvocation[]
    partialText?: string
  }

  /** 一次 user 发送触发的完整 agent run */
  interface Run {
    status: RunStatus
    steps: RunStep[]
    finalText: string | null
    error?: string
  }

  /** 单轮 user 对话 */
  interface Turn {
    turnIndex: number
    user: UserMessage
    run: Run
    /** 含 tool call 时用于精确回放 API 消息链 */
    apiTrace?: AgentApi.Message[]
  }

  /** 单个 Agent 对话 session（对应右侧一个页签） */
  interface Session {
    id: number
    title: string
    mode: Mode
    turns: Turn[]
    documentContext: initialContext | null
    createTime: string
  }

  interface State {
    sessions: Session[]
    activeSessionId: number | null
    running: {
      sessionId: number | null
      turnIndex: number | null
    }
  }
}
