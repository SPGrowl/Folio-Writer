import { defineStore } from 'pinia'
import { streamAgentTurn } from '@/api/agent'
import { t } from '@/locales'
import { useComposeTabStore } from '../composeTab'
import { useComposeStore } from '../compose'
import {
  buildSystemPrompt,
  createEmptySession,
  createRunStep,
  createTurn,
  defaultState,
  findSessionById,
  findSessionIndex,
  findTurn,
  getCurrentRunStep,
  setSessionTitle,
} from './helper'
import {
  AGENT_TOOL_REGISTRY,
  applyAssistantDelta,
  createPendingAssistant,
  executeAgentTool,
  finalizeAssistantMessage,
  syncInvocationFromDelta,
} from './tools'

let abortController: AbortController | null = null

export const useAgentStore = defineStore('agent-store', {
  state: (): Agent.State => defaultState(),

  getters: {
    activeSession(state): Agent.Session | null {
      if (state.activeSessionId == null)
        return null
      return findSessionById(state.sessions, state.activeSessionId) ?? null
    },

    activeTurns(state): Agent.Turn[] {
      if (state.activeSessionId == null)
        return []
      return findSessionById(state.sessions, state.activeSessionId)?.turns ?? []
    },

    isRunning(state): boolean {
      return state.running.sessionId != null
    },

    getSessionById(state) {
      return (id: number) => findSessionById(state.sessions, id) ?? null
    },
  },

  actions: {
    createSession(mode: Agent.Mode = 'agent') {
      const session = createEmptySession(mode)
      session.title = t('compose.agent.newTabTitle', { n: this.sessions.length + 1 })
      this.sessions.push(session)
      this.activeSessionId = session.id
      return session.id
    },

    switchSession(id: number) {
      if (!findSessionById(this.sessions, id))
        return
      if (this.isRunning)
        this.abortRun()
      this.activeSessionId = id
    },

    closeSession(id: number) {
      if (this.sessions.length <= 1)
        return

      const index = findSessionIndex(this.sessions, id)
      if (index === -1)
        return

      if (this.running.sessionId === id)
        this.abortRun()

      this.sessions.splice(index, 1)

      if (this.activeSessionId === id) {
        const next = this.sessions[Math.max(0, index - 1)] ?? this.sessions[0]
        this.activeSessionId = next?.id ?? null
      }
    },

    setMode(id: number, mode: Agent.Mode) {
      const session = findSessionById(this.sessions, id)
      if (!session || this.isRunning)
        return
      session.mode = mode
    },

    initContext(): Agent.DocumentContext | null {
      const tab = useComposeTabStore().activeTab
      if (!tab)
        return null

      const composeStore = useComposeStore()
      const article = composeStore.findArticle(tab.linkedID)
      const group = article
        ? composeStore.groups.find(g => g.id === article.linkedGroup)
        : null

      return {
        articleId: tab.linkedID,
        title: tab.title || article?.title || '',
        content: tab.draft,
        groupId: group?.id ?? article?.linkedGroup ?? '',
        groupName: group?.name ?? '',
        capturedAt: new Date().toISOString(),
      }
    },

    addTurn(sessionId: number, text: string) {
      const session = findSessionById(this.sessions, sessionId)
      if (!session)
        return -1

      const turnIndex = session.turns.length
      session.turns.push(createTurn(turnIndex, text))

      if (turnIndex === 0)
        session.title = setSessionTitle(text)

      return turnIndex
    },

    appendReasoning(sessionId: number, turnIndex: number, delta: string) {
      const turn = findTurn(findSessionById(this.sessions, sessionId)!, turnIndex)
      if (!turn)
        return

      const step = getCurrentRunStep(turn.run)
      step.reasoning = (step.reasoning ?? '') + delta
    },

    appendReply(sessionId: number, turnIndex: number, delta: string) {
      const turn = findTurn(findSessionById(this.sessions, sessionId)!, turnIndex)
      if (!turn)
        return

      const step = getCurrentRunStep(turn.run)
      step.partialText = (step.partialText ?? '') + delta
    },

    finishRun(sessionId: number, turnIndex: number, finalText?: string) {
      const session = findSessionById(this.sessions, sessionId)
      const turn = session ? findTurn(session, turnIndex) : null
      if (!turn)
        return

      const step = getCurrentRunStep(turn.run)
      turn.run.finalText = finalText ?? step.partialText ?? ''
      turn.run.status = 'done'
      this.running = { sessionId: null, turnIndex: null }
    },

    setRunError(sessionId: number, turnIndex: number, message: string) {
      const session = findSessionById(this.sessions, sessionId)
      const turn = session ? findTurn(session, turnIndex) : null
      if (!turn)
        return

      turn.run.status = 'error'
      turn.run.error = message
      turn.run.finalText = message
      this.running = { sessionId: null, turnIndex: null }
    },

    composeRequest(sessionId: number, turnIndex: number): AgentApi.Message[] {
      const session = findSessionById(this.sessions, sessionId)
      if (!session)
        return []

      const messages: AgentApi.Message[] = [
        { role: 'system', content: buildSystemPrompt(session) },
      ]

      for (let i = 0; i < turnIndex; i++) {
        const turn = session.turns[i]
        messages.push({ role: 'user', content: turn.user.text })

        if (turn.apiTrace?.length) {
          messages.push(...turn.apiTrace)
        }
        else if (turn.run.finalText) {
          messages.push({ role: 'assistant', content: turn.run.finalText })
        }
      }

      const currentTurn = session.turns[turnIndex]
      if (currentTurn)
        messages.push({ role: 'user', content: currentTurn.user.text })

      return messages
    },

    abortRun() {
      abortController?.abort()
      abortController = null

      const { sessionId, turnIndex } = this.running
      if (sessionId != null && turnIndex != null) {
        const turn = findTurn(findSessionById(this.sessions, sessionId)!, turnIndex)
        if (turn && (turn.run.status === 'streaming' || turn.run.status === 'tool_running'))
          turn.run.status = 'error'
      }

      this.running = { sessionId: null, turnIndex: null }
    },

    toolDisplayName(name: string) {
      return AGENT_TOOL_REGISTRY[name]?.displayName ?? name
    },

    /**
     * Agent 子循环：流式请求 → 若 finish_reason=tool_calls 则执行工具 → 继续请求，直到最终回复。
     * 含 tool 的轮次会将完整 assistant/tool 消息写入 turn.apiTrace 供后续多轮回放。
     */
    async runTurn(sessionId: number, turnIndex: number) {
      const session = findSessionById(this.sessions, sessionId)!
      const turn = findTurn(session, turnIndex)!
      let messages = this.composeRequest(sessionId, turnIndex)
      turn.apiTrace = []

      while (true) {
        const step = getCurrentRunStep(turn.run)
        const pending = createPendingAssistant()
        let finishReason: AgentApi.FinishReason = null

        await streamAgentTurn(
          {
            mode: session.mode,
            messages,
            documentContext: session.documentContext,
            enableTools: session.mode === 'agent',
          },
          {
            signal: abortController!.signal,
            onChunk: (delta: AgentApi.StreamDelta, meta: AgentApi.StreamChunkMeta) => {
              applyAssistantDelta(pending, delta)
              if (delta.reasoning_content)
                this.appendReasoning(sessionId, turnIndex, delta.reasoning_content)
              if (delta.content)
                this.appendReply(sessionId, turnIndex, delta.content)
              syncInvocationFromDelta(step, delta, name => this.toolDisplayName(name))
              if (meta.finishReason != null)
                finishReason = meta.finishReason
            },
            onDone: (meta: AgentApi.StreamChunkMeta) => {
              if (meta.finishReason != null)
                finishReason = meta.finishReason
            },
            onError: (message: string) => {
              throw new Error(message)
            },
          },
        )

        const assistantMsg = finalizeAssistantMessage(pending)
        messages = [...messages, assistantMsg]
        turn.apiTrace.push(assistantMsg)

        const needsToolRun = (finishReason === 'tool_calls' || assistantMsg.tool_calls?.length)
          && assistantMsg.tool_calls?.length

        if (!needsToolRun) {
          this.finishRun(sessionId, turnIndex, assistantMsg.content || step.partialText || '')
          return
        }

        turn.run.status = 'tool_running'

        for (const tc of assistantMsg.tool_calls!) {
          let inv = step.invocations.find(item => item.id === tc.id)
          if (!inv) {
            inv = {
              id: tc.id,
              name: tc.function.name,
              displayName: this.toolDisplayName(tc.function.name),
              status: 'calling',
              paramsSummary: '',
            }
            step.invocations.push(inv)
          }

          try {
            const { payload, paramsSummary, resultSummary } = executeAgentTool(
              tc.function.name,
              tc.function.arguments,
            )
            inv.status = 'done'
            inv.paramsSummary = paramsSummary
            inv.resultSummary = resultSummary

            const toolMsg: AgentApi.Message = {
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(payload),
            }
            messages.push(toolMsg)
            turn.apiTrace.push(toolMsg)
          }
          catch (error: any) {
            const errMsg = error?.message ?? '工具执行失败'
            inv.status = 'failed'
            inv.error = errMsg
            this.setRunError(sessionId, turnIndex, errMsg)
            return
          }
        }

        // 工具执行完毕，进入下一轮 assistant 流式（新 RunStep 承载后续 reasoning/content）
        turn.run.status = 'streaming'
        turn.run.steps.push(createRunStep(turn.run.steps.length))
      }
    },

    async sendMessage(text: string) {
      const trimmed = text.trim()
      const session = this.activeSession
      if (!session || !trimmed || this.isRunning)
        return

      const sessionId = session.id
      const isFirstTurn = session.turns.length === 0

      if (isFirstTurn && !session.documentContext)
        session.documentContext = this.initContext()

      const turnIndex = this.addTurn(sessionId, trimmed)
      if (turnIndex < 0)
        return

      const turn = findTurn(session, turnIndex)!
      turn.run.status = 'streaming'
      turn.run.steps = [createRunStep(0)]
      this.running = { sessionId, turnIndex }

      abortController = new AbortController()

      try {
        await this.runTurn(sessionId, turnIndex)
      }
      catch (error: any) {
        if (error?.name === 'AbortError')
          return
        this.setRunError(sessionId, turnIndex, error?.message ?? 'Request failed')
      }
      finally {
        abortController = null
      }
    },
  },
})
