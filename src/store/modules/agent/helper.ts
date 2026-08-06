import { t } from '@/locales'

let sessionIdSeq = Date.now()

export function allocateSessionId(): number {
  return sessionIdSeq++
}

export function defaultState(): AgentStep.State {
  const session = createEmptySession()
  return {
    sessions: [session],
    activeSessionId: session.id,
    running: null,
  }
}

export function createEmptySession(mode: AgentStep.Mode = 'agent'): AgentStep.Session {
  return {
    id: allocateSessionId(),
    title: t('compose.agent.newTabTitle', { n: 1 }),
    mode,
    documentContext: null,
    steps: [],
    createTime: new Date().toISOString(),
  }
}

export function findSessionIndex(sessions: AgentStep.Session[], id: number) {
  return sessions.findIndex(item => item.id === id)
}

export function findSessionById(sessions: AgentStep.Session[], id: number) {
  return sessions.find(item => item.id === id)
}

/** 保留 index <= fromIndex 的 step，删除其后所有 step（线性截断，不 reindex） */
export function truncateStepsAfter(steps: AgentStep.Step[], fromIndex: number): void {
  if (fromIndex < 0) {
    steps.splice(0, steps.length)
    return
  }
  steps.splice(fromIndex + 1)
}

export function nextStepIndex(steps: AgentStep.Step[]): number {
  if (steps.length === 0)
    return 0
  return steps[steps.length - 1].index + 1
}

export function createUserStep(index: number, content: string): AgentStep.UserStep {
  return { role: 'user', content, index }
}

export function createAssistantStep(
  index: number,
  partial: Partial<Omit<AgentStep.AssistantStep, 'role' | 'index'>> = {},
): AgentStep.AssistantStep {
  return {
    role: 'assistant',
    index,
    status: 'streaming',
    ...partial,
  }
}

export function createToolStep(
  index: number,
  toolCallId: string,
  content: string,
  partial: Partial<Omit<AgentStep.ToolStep, 'role' | 'index' | 'tool_call_id' | 'content'>> = {},
): AgentStep.ToolStep {
  return {
    role: 'tool',
    index,
    tool_call_id: toolCallId,
    content,
    status: 'running',
    ...partial,
  }
}
