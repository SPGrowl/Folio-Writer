import { defineStore } from 'pinia'
import { defaultState, getLocalState, setLocalState } from './helper'
import { router } from '@/router'
import { t } from '@/locales'
import { log } from 'console'

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
    // TODO：禁止无限新建空会话，或者必须有Prompt才能建立会话
   createSession(prompt:string) {
    // TODO：UI层应该检查Prompt是否为空，禁止发送空消息
    //清除占位消息
    this.sessions = this.sessions.filter(s => !this.isEmptySession(s))
      const uuid = Date.now()
      const context:Chat.ChatTurn[]=[{
        turnIndex:0,
        user:{
          role:'user',
          text:prompt,
          dateTime:new Date().toISOString(),
        },
        assistant:{
          role:'assistant',
          text:null,
          //TODO:存疑，可能依赖响应结束的时间
          dateTime:new Date().toISOString(),
        // 思考中
        },
      }]
      const newSession: Chat.Session = {
        uuid,
        title: sessionTitleFromPrompt(prompt),
        context,
        createTime:new Date().toISOString(),
      }
      this.sessions.unshift(newSession)
      this.activeUuid = uuid
      this.recordState()
      // TODO：应该在Store里加载路由吗？
      this.reloadRoute(uuid)
    },

		//TODO:发出Prompt（应该放在API层或者UI层）

    /** 切换当前会话（对应原版 setActive） */
    async setActive(uuid: number) {
      this.activeUuid = uuid
      return await this.reloadRoute(uuid)
    },

    getPrompt(uuid: number,turnIndex: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if(sessionIndex === -1)
        {return}
      const turn = this.sessions[sessionIndex].context.find(item => item.turnIndex === turnIndex)
      if(turn)
        {return turn.user.text}
      return null
    },

    // 重试或更改prompt，绑定在重试按钮或消息的输入框里
    retryTurn(uuid: number,turnIndex: number, text?: string) {
      
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      let currentPrompt:string|null=null
      if(sessionIndex === -1)
        {return}
      const currentSession=this.sessions[sessionIndex]
      if(text!==null&&text!==undefined&&text.trim()!=='') {
        currentPrompt= text
      }
      else{
        currentPrompt= this.getPrompt(uuid,turnIndex) as string
      }
      if(turnIndex>currentSession.context.length-1||turnIndex<0) {return}
      const currentTurn=currentSession.context[turnIndex]
      console.log(currentPrompt)
      currentTurn.user.text=currentPrompt
      currentTurn.assistant.text=null
      // 从此处截断上下文
      this.sliceContext(uuid,turnIndex)
      this.recordState()
    },
    addTurn(uuid: number, text: string) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if(sessionIndex === -1)
        {return}
      const currentSession=this.sessions[sessionIndex]
      const newTurn:Chat.ChatTurn={
        turnIndex:currentSession.context.length,
        user:{role:'user',text:text,dateTime:new Date().toISOString()},
        assistant:{role:'assistant',text:null,dateTime:new Date().toISOString(),reasoning_content:"Thinking..."},
      }
      currentSession.context.push(newTurn)
      this.recordState()
  
    },

    // TODO：待设计：减少类型断言
    composeRequest(uuid: number,turnIndex: number):OpenAI.Message[] {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if(sessionIndex === -1)
        {return []}
      const currentSession=this.sessions[sessionIndex]
      // TODO：插入一条系统提示词
      const request=[{role:'system',content:"You are a helpful LLM assistant."}]
      for(let i=0;i<=turnIndex;i++) {
        if(i<turnIndex) {
          console.log(currentSession.context[i]);
      const {user,assistant}=currentSession.context[i]
      request.push({role:user.role,content:user.text as string })
      request.push({role:assistant.role,content:assistant.text as string })
      }
      else{
        const {user}=currentSession.context[i]
        request.push({role:user.role,content:user.text as string })
      }
      }
      // TODO:减少类型断言
      return request as OpenAI.Message[]
    },
    sliceContext(uuid: number, turnIndex: number) {
      const sessionIndex = findSessionIndex(this.sessions, uuid)
      if (sessionIndex !== -1) {
        this.sessions[sessionIndex].context = this.sessions[sessionIndex].context.slice(0, turnIndex+1)
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
    /** 清空全部会话（对应原版 clearHistory） */
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


