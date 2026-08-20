import { defineStore } from 'pinia'
import { abortCurrentTask } from '@/agent/control/abort'
import { t } from '@/locales'
import {
  createAssistantStep,
  createEmptySession,
  createToolStep,
  createUserStep,
  defaultState,
  findSessionById,
  findSessionIndex,
  nextStepIndex,
  truncateStepsAfter as spliceStepsAfter,
} from './helper'

/** Agent store：侧栏页签 + Step 扁平链（无持久化；不支持多会话并发） */
export const useAgentStore = defineStore('agent-store', {
  state: (): AgentStep.State => defaultState(),

  getters: {
    activeSession(state): AgentStep.Session | null {
      if (state.activeSessionId == null)
        return null
      return findSessionById(state.sessions, state.activeSessionId) ?? null
    },

    activeSteps(state): AgentStep.Step[] {
      return findSessionById(state.sessions, state.activeSessionId ?? -1)?.steps ?? []
    },

    isRunning(state): boolean {
      return state.running != null
    },
  },

  actions: {
    abortRunning() {
      abortCurrentTask()
      this.running = null
    },

    findSession(id: number) {
      return findSessionById(this.sessions, id)
    },

    createSession(mode: AgentStep.Mode = 'agent') {
      this.abortRunning()
      const session = createEmptySession(mode)
      session.title = t('compose.agent.newTabTitle', { n: this.sessions.length + 1 })
      this.sessions.push(session)
      this.activeSessionId = session.id
      return session.id
    },

    switchSession(id: number) {
      if (!findSessionById(this.sessions, id))
        return
      if (this.activeSessionId !== id)
        this.abortRunning()
      this.activeSessionId = id
    },

    closeSession(id: number) {
      if (this.sessions.length <= 1)
        return

      const index = findSessionIndex(this.sessions, id)
      if (index === -1)
        return

      const closingActive = this.activeSessionId === id
      if (closingActive)
        this.abortRunning()

      this.sessions.splice(index, 1)

      if (closingActive) {
        const next = this.sessions[Math.max(0, index - 1)] ?? this.sessions[0]
        this.activeSessionId = next?.id ?? null
      }
    },

    setSessionTitle(title: string) {
      const session = this.activeSession
      if (!session)
        return
      session.title = title
    },

    setMode(mode: AgentStep.Mode) {
      const session = this.activeSession
      if (!session || this.isRunning)
        return
      session.mode = mode
    },

    setDocumentContext(context: AgentStep.InitialContext | null) {
      const session = this.activeSession
      if (!session)
        return
      session.documentContext = context
    },

    setRunning(running: AgentStep.Running | null) {
      this.running = running
    },

    /** 选中 user step 后重发：保留该节点及之前，删除其后所有 step */
    truncateStepsAfter(userStepIndex: number): boolean {
      const session = this.activeSession
      if (!session || this.isRunning)
        return false

      const anchor = session.steps[userStepIndex]
      if (!anchor || anchor.role !== 'user' || anchor.index !== userStepIndex)
        return false

      spliceStepsAfter(session.steps, userStepIndex)
      return true
    },

    /** 替换整段 step 链（调用方保证 index 线性） */
    replaceSteps(steps: AgentStep.Step[]): boolean {
      const session = this.activeSession
      if (!session || this.isRunning)
        return false

      session.steps = steps
      return true
    },

    appendStep(step: AgentStep.Step): AgentStep.Step | null {
      const session = this.activeSession
      if (!session)
        return null

      const index = nextStepIndex(session.steps)
      step.index = index
      session.steps.push(step)
      return step
    },

    pushUserStep(content: string): AgentStep.UserStep | null {
      const session = this.activeSession
      if (!session)
        return null

      const step = createUserStep(nextStepIndex(session.steps), content)
      session.steps.push(step)
      return step
    },

    pushAssistantStep(
      partial: Partial<Omit<AgentStep.AssistantStep, 'role' | 'index'>> = {},
    ): AgentStep.AssistantStep | null {
      const session = this.activeSession
      if (!session)
        return null

      const step = createAssistantStep(nextStepIndex(session.steps), partial)
      session.steps.push(step)
      return step
    },

    pushToolStep(
      toolCallId: string,
      content: string,
      partial: Partial<Omit<AgentStep.ToolStep, 'role' | 'index' | 'tool_call_id' | 'content'>> = {},
    ): AgentStep.ToolStep | null {
      const session = this.activeSession
      if (!session)
        return null

      const step = createToolStep(nextStepIndex(session.steps), toolCallId, content, partial)
      session.steps.push(step)
      return step
    },

    /** 合并改写 tool 展示槽，避免 Object.assign 整键替换冲掉另外两句 */
    patchToolMsgSlot(stepIndex: number, slot: AgentStep.ToolStatus, text: string): boolean {
      const session = this.activeSession
      if (!session)
        return false

      const step = session.steps[stepIndex]
      if (!step || step.role !== 'tool' || step.index !== stepIndex)
        return false

      step.msg = { ...step.msg, [slot]: text }
      return true
    },

    /** 按 index 局部更新 step（流式 patch 等） */
    patchStepAt(stepIndex: number, patch: Partial<AgentStep.Step>): boolean {
      const session = this.activeSession
      if (!session)
        return false

      const step = session.steps[stepIndex]
      if (!step || step.index !== stepIndex)
        return false

      Object.assign(step, patch)
      return true
    },

    /** 指定 session 内 patch step（accept/reject 回写 tool 状态） */
    patchStepInSession(
      sessionId: number,
      stepIndex: number,
      patch: Partial<AgentStep.Step>,
    ): boolean {
      const session = findSessionById(this.sessions, sessionId)
      if (!session)
        return false

      const step = session.steps[stepIndex]
      if (!step || step.index !== stepIndex)
        return false

      Object.assign(step, patch)
      return true
    },
  },
})
