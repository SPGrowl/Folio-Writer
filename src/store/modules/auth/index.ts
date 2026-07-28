import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'
import { store } from '@/store/helper'
import { fetchSession } from '@/api'

interface SessionResponse {
  auth: boolean
  model: 'ChatGPTAPI' | 'ChatGPTUnofficialProxyAPI'
}

export interface AuthState {
  token: string | undefined
  session: SessionResponse | null
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => ({
    token: getToken(),
    session: null,
  }),

  getters: {
    isChatGPTAPI(state): boolean {
      // 判断传入的会话对象的特定字段是否为ChatGPTAPI
      return state.session?.model === 'ChatGPTAPI'
    },
  },

  actions: {
    // 获取会话数据
    async getSession() {
      const res = await fetchSession<SessionResponse>()
      if (!res?.data)
        return Promise.reject(new Error(res?.message ?? 'Session data is empty'))

      this.session = { ...res.data }
      return res.data
    },

    setToken(token: string) {
      this.token = token
      setToken(token)
    },

    removeToken() {
      this.token = undefined
      removeToken()
    },
  },
})

export function useAuthStoreWithout() {
  return useAuthStore(store)
}
