import { defineStore } from 'pinia'
import { defaultState, getLocalState, setLocalState } from './helper'
import { router } from '@/router'
import { t } from '@/locales'

function findSessionIndex(sessions: Chat.Session[], uuid: number) {
  return sessions.findIndex(item => item.uuid === uuid)
}

export const useSessionStore = defineStore('session-store', {
  state: (): Chat.SessionState => getLocalState(),

  getters: {
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


    /** 新建会话（对应原版 addHistory） */
    // TODO：禁止无限新建空会话，或者必须有Prompt才能建立会话
    createSession(prompt:string) {
      const uuid = Date.now()
      const context:Chat.ChatTurn[]=[{
        count:0,
        user:{
          role:'user',
          text:prompt,
          inversion:true,
          dateTime:new Date().toISOString(),
        },
        assistant:{
          role:'assistant',
          text:null,
          dateTime:new Date().toISOString(),
          inversion:false,
        // 思考中
          loading:true,
        },
      }]
      const newSession: Chat.Session = {
        uuid,
        title: t('chat.newChatTitle'),
        isEdit:false,
        context,
        createTime:new Date().toISOString(),
      }
      this.sessions.unshift(newSession)
      this.activeUuid = uuid
      this.reloadRoute(uuid)
    },

    /** 更新会话元信息（对应原版 updateHistory） */
    updateSession(uuid: number, edit: Partial<Chat.Session>) {
      const index = findSessionIndex(this.sessions, uuid)
      if (index !== -1) {
        this.sessions[index] = { ...this.sessions[index], ...edit }
        this.recordState()
      }
    },

    /** 按侧边栏下标删除会话（对应原版 deleteHistory） */
    async deleteSession(index: number) {
      this.sessions.splice(index, 1)

      if (this.sessions.length === 0) {
        this.activeUuid = null
        this.reloadRoute()
        return
      }

      if (index > 0 && index <= this.sessions.length) {
        const uuid = this.sessions[index - 1].uuid
        this.activeUuid = uuid
        this.reloadRoute(uuid)
        return
      }

      if (index === 0) {
        if (this.sessions.length > 0) {
          const uuid = this.sessions[0].uuid
          this.activeUuid = uuid
          this.reloadRoute(uuid)
        }
      }

      if (index > this.sessions.length) {
        const uuid = this.sessions[this.sessions.length - 1].uuid
        this.activeUuid = uuid
        this.reloadRoute(uuid)
      }
    },

    /** 切换当前会话（对应原版 setActive） */
    async setActive(uuid: number) {
      this.activeUuid = uuid
      return await this.reloadRoute(uuid)
    },

    getTurnByUuidAndIndex(uuid: number, index: number) {
      if (!uuid || uuid === 0) {
        if (this.sessions.length)
          return this.sessions[0].context[index] ?? null
        return null
      }
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1)
        return this.sessions[sessionIndex].context[index] ?? null
      return null
    },

    /**
     * 追加一轮对话（对应原版 addChatByUuid）
     * 首条 user 消息会自动更新默认标题
     */
    addTurn(uuid: number, turn: Chat.ChatTurn) {
      const titleFromUser = turn.user.text?.trim()

      if (!uuid || uuid === 0) {
        if (this.sessions.length === 0) {
          const newUuid = Date.now()
          this.sessions.push({
            uuid: newUuid,
            title: titleFromUser || t('chat.newChatTitle'),
            isEdit: false,
            context: [turn],
            createTime: new Date().toISOString(),
          })
          this.activeUuid = newUuid
          this.recordState()
        }
        else {
          this.sessions[0].context.push(turn)
          if (this.sessions[0].title === t('chat.newChatTitle') && titleFromUser)
            this.sessions[0].title = titleFromUser
          this.recordState()
        }
        return
      }

      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context.push(turn)
        if (this.sessions[sessionIndex].title === t('chat.newChatTitle') && titleFromUser)
          this.sessions[sessionIndex].title = titleFromUser
        this.recordState()
      }
    },

    /** 整轮替换（对应原版 updateChatByUuid） */
    updateTurn(uuid: number, index: number, turn: Chat.ChatTurn) {
      if (!uuid || uuid === 0) {
        if (this.sessions.length) {
          this.sessions[0].context[index] = turn
          this.recordState()
        }
        return
      }

      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context[index] = turn
        this.recordState()
      }
    },

    /** 整轮局部更新（对应原版 updateChatSomeByUuid） */
    updateTurnSome(uuid: number, index: number, patch: Partial<Chat.ChatTurn>) {
      if (!uuid || uuid === 0) {
        if (this.sessions.length) {
          const current = this.sessions[0].context[index]
          if (current)
            this.sessions[0].context[index] = mergeTurn(current, patch)
          this.recordState()
        }
        return
      }

      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        const current = this.sessions[sessionIndex].context[index]
        if (current)
          this.sessions[sessionIndex].context[index] = mergeTurn(current, patch)
        this.recordState()
      }
    },

    /** 按轮次 count 更新 user 气泡文案（输入框草稿等场景） */
    updatePrompt(uuid: number, count: number, text: string) {
      const sessionIndex = !uuid || uuid === 0
        ? (this.sessions.length ? 0 : -1)
        : findSessionIndex(this.sessions, uuid)

      if (sessionIndex === -1)
        return

      const turn = this.sessions[sessionIndex].context.find(item => item.count === count)
      if (turn) {
        turn.user.text = text
        this.recordState()
      }
    },

    /** 更新 user 或 assistant 气泡（流式、错误态等） */
    updateTurnBubble(
      uuid: number,
      index: number,
      role: 'user' | 'assistant',
      patch: Partial<Chat.Bubble & { reasoning_content?: string }>,
    ) {
      const { reasoning_content, ...bubblePatch } = patch
      const turnPatch: Partial<Chat.ChatTurn> = role === 'user'
        ? { user: { role: 'user', ...bubblePatch } as Chat.ChatTurn['user'] }
        : {
            assistant: {
              role: 'assistant',
              ...(reasoning_content !== undefined ? { reasoning_content } : {}),
              ...bubblePatch,
            } as Chat.ChatTurn['assistant'],
          }
      this.updateTurnSome(uuid, index, turnPatch)
    },

    /** 删除一轮（对应原版 deleteChatByUuid） */
    deleteTurn(uuid: number, index: number) {
      if (!uuid || uuid === 0) {
        if (this.sessions.length) {
          this.sessions[0].context.splice(index, 1)
          this.recordState()
        }
        return
      }

      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context.splice(index, 1)
        this.recordState()
      }
    },

    /** 清空当前会话上下文（对应原版 clearChatByUuid） */
    clearContext(uuid: number) {
      if (!uuid || uuid === 0) {
        if (this.sessions.length) {
          this.sessions[0].context = []
          this.recordState()
        }
        return
      }

      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context = []
        this.recordState()
      }
    },
    cutUpContext(uuid: number, count: number,prompt?:string) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        let currentTurn = this.sessions[sessionIndex].context[count]
        if (prompt) {
          currentTurn.user.text = prompt
        }
        this.sessions[sessionIndex].context = this.sessions[sessionIndex].context.slice(0, count)
        this.recordState()
      }
    },

    /** 清空全部会话（对应原版 clearHistory） */
    clearSessions() {
      this.$state = { ...defaultState() }
      this.recordState()
    },

    async reloadRoute(uuid?: number) {
      this.recordState()
      await router.push({ name: 'Chat', params: { uuid } })
    },
  },
})

function mergeTurn(current: Chat.ChatTurn, patch: Partial<Chat.ChatTurn>): Chat.ChatTurn {
  return {
    ...current,
    ...patch,
    user: patch.user ? { ...current.user, ...patch.user, role: 'user' } : current.user,
    assistant: patch.assistant
      ? { ...current.assistant, ...patch.assistant, role: 'assistant' }
      : current.assistant,
  }
}
