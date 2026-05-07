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
      try {
        // 从后端获取会话信息
        const { data } = await fetchSession<SessionResponse>()
        // 将会话信息存入store
        this.session = { ...data }
        // 等价于: return data,存入后返回data
        return Promise.resolve(data)
      }
      catch (error) {
        return Promise.reject(error)
      }
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
