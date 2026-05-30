import { defineStore } from 'pinia'
import { defaultState, getLocalState, setLocalState } from './helper'
import { router } from '@/router'
import { t } from '@/locales'
import { useSettingStore } from '@/store'

const SESSION_TITLE_MAX_LENGTH = 20

function sessionTitleFromPrompt(prompt: string) {
  const text = prompt.trim().replace(/\s+/g, ' ')
  if (!text)
    return t('chat.newChatTitle')
  if (text.length <= SESSION_TITLE_MAX_LENGTH)
    return text
  return `${text.slice(0, SESSION_TITLE_MAX_LENGTH)}...`
}

function findSessionIndex(sessions: Chat.Session[], uuid: number) {
  return sessions.findIndex(item => item.uuid === uuid)
}

function findTurn(session: Chat.Session, turnIndex: number) {
  return session.context.find(item => item.turnIndex === turnIndex)
}

export const useSessionStore = defineStore('session-store', {
  state: (): Chat.SessionState => getLocalState(),

  getters: {
    active(state: Chat.SessionState): number | null {
      return state.activeUuid
    },

    getActiveSession(state: Chat.SessionState): Chat.Session | null {
      if (state.activeUuid == null)
        return null
      return state.sessions.find(item => item.uuid === state.activeUuid) ?? null
    },

    getSessionByUuid(state: Chat.SessionState) {
      return (uuid?: number) => {
        const id = uuid ?? state.activeUuid
        if (id == null)
          return null
        return state.sessions.find(item => item.uuid === id) ?? null
      }
    },

    getTurnsByUuid(state: Chat.SessionState) {
      return (uuid?: number) => {
        const id = uuid ?? state.activeUuid
        if (id == null)
          return []
        return state.sessions.find(item => item.uuid === id)?.context ?? []
      }
    },
  },

  actions: {
    recordState() {
      setLocalState(this.$state)
    },
    isEmptySession(s: Chat.Session) {
      return s.context.length === 0
    },

    /** 新建会话（对应原版 addHistory） */
    createSession(prompt: string) {
      this.sessions = this.sessions.filter(s => !this.isEmptySession(s))
      const uuid = Date.now()
      const context: Chat.ChatTurn[] = [{
        turnIndex: 0,
        user: {
          role: 'user',
          text: prompt,
          dateTime: new Date().toISOString(),
        },
        assistant: {
          role: 'assistant',
          text: null,
          dateTime: new Date().toISOString(),
        },
      }]
      const newSession: Chat.Session = {
        uuid,
        title: sessionTitleFromPrompt(prompt),
        context,
        createTime: new Date().toISOString(),
      }
      this.sessions.unshift(newSession)
      this.activeUuid = uuid
      this.recordState()
      this.reloadRoute(uuid)
    },

    async setActive(uuid: number) {
      this.activeUuid = uuid
      return await this.reloadRoute(uuid)
    },

    getPrompt(uuid: number, turnIndex: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return
      const turn = this.sessions[sessionIndex].context.find(item => item.turnIndex === turnIndex)
      if (turn)
        return turn.user.text
      return null
    },

    retryTurn(uuid: number, turnIndex: number, text?: string) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      let currentPrompt: string | null = null
      if (sessionIndex === -1)
        return
      const currentSession = this.sessions[sessionIndex]
      if (text !== null && text !== undefined && text.trim() !== '')
        currentPrompt = text
      else
        currentPrompt = this.getPrompt(uuid, turnIndex) as string
      if (turnIndex > currentSession.context.length - 1 || turnIndex < 0)
        return
      const currentTurn = currentSession.context[turnIndex]
      currentTurn.user.text = currentPrompt
      currentTurn.assistant.text = null
      currentTurn.assistant.reasoning_content = undefined
      currentTurn.assistant.error = undefined
      this.sliceContext(uuid, turnIndex)
      this.recordState()
    },

    addTurn(uuid: number, text: string) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return
      const currentSession = this.sessions[sessionIndex]
      const newTurn: Chat.ChatTurn = {
        turnIndex: currentSession.context.length,
        user: { role: 'user', text, dateTime: new Date().toISOString() },
        assistant: {
          role: 'assistant',
          text: null,
          dateTime: new Date().toISOString(),
        },
      }
      currentSession.context.push(newTurn)
      this.recordState()
    },

    /**
     * 流式追加 assistant 分片（由 SSE onChunk 调用）。
     * 不在每次分片时 recordState，流结束后由 finishTurn 统一持久化。
     */
    appendAssistantDelta(
      uuid: number,
      turnIndex: number,
      delta: OpenAI.StreamDelta,
    ) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return
      const turn = findTurn(this.sessions[sessionIndex], turnIndex)
      if (!turn)
        return

      if (delta.reasoning_content)
        turn.assistant.reasoning_content = (turn.assistant.reasoning_content ?? '') + delta.reasoning_content

      if (delta.content)
        turn.assistant.text = (turn.assistant.text ?? '') + delta.content
    },

    /** 流式响应正常结束 */
    finishTurn(uuid: number, turnIndex: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return
      const turn = findTurn(this.sessions[sessionIndex], turnIndex)
      if (!turn)
        return
      turn.assistant.dateTime = new Date().toISOString()
      this.recordState()
    },

    /** 流式响应失败 */
    setTurnError(uuid: number, turnIndex: number, message: string) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return
      const turn = findTurn(this.sessions[sessionIndex], turnIndex)
      if (!turn)
        return
      turn.assistant.error = true
      turn.assistant.text = message
      this.recordState()
    },

    /** 组装 OpenAI messages 数组，供 submitRequestBody 使用 */
    composeRequest(uuid: number, turnIndex: number): OpenAI.Message[] {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return []
      const currentSession = this.sessions[sessionIndex]
      const settingStore = useSettingStore()
      const request: OpenAI.Message[] = [{
        role: 'system',
        content: settingStore.systemMessage,
      }]

      for (let i = 0; i <= turnIndex; i++) {
        const { user, assistant } = currentSession.context[i]
        if (i < turnIndex) {
          request.push({ role: user.role, content: user.text as string })
          // 历史轮次：assistant 尚未回复完成则跳过
          if (assistant.text)
            request.push({ role: assistant.role, content: assistant.text })
        }
        else {
          request.push({ role: user.role, content: user.text as string })
        }
      }
      return request
    },

    sliceContext(uuid: number, turnIndex: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context = this.sessions[sessionIndex].context.slice(0, turnIndex + 1)
        this.recordState()
      }
    },

    async deleteSession(uuid: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex === -1)
        return

      const wasActive = this.activeUuid === uuid
      this.sessions.splice(sessionIndex, 1)

      if (this.sessions.length === 0) {
        this.activeUuid = null
        await this.reloadRoute()
        return
      }

      if (wasActive) {
        const nextIndex = sessionIndex > 0 ? sessionIndex - 1 : 0
        this.activeUuid = this.sessions[nextIndex].uuid
        await this.reloadRoute(this.activeUuid)
        return
      }

      this.recordState()
    },

    clearSessions() {
      this.$state = { ...defaultState() }
      this.recordState()
    },

    async reloadRoute(uuid?: number) {
      this.recordState()
      if (uuid)
        await router.push({ name: 'Chat', params: { uuid: String(uuid) } })
      else
        await router.push({ name: 'Home' })
    },
  },
})
