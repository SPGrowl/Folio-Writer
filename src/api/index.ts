import type { AxiosProgressEvent, GenericAbortSignal } from 'axios'
import { post } from '@/utils/request'
import { useAuthStore, useSettingStore } from '@/store'


// 参数:本次提示词Prompt,本次会话ID,parentMessageId,
// promt,option会被打包放入data中
// signal为最终POST请求的单独参数
export function fetchChatAPI<T = any>(
  prompt: string,
  options?: { conversationId?: string; parentMessageId?: string },
  signal?: GenericAbortSignal,
) {
  return post<T>({
    url: '/chat',
    data: { prompt, options },
    signal,
  })
}

export function fetchChatConfig<T = any>() {
  return post<T>({
    url: '/config',
  })
}

// 发送请求到后端
export function fetchChatAPIProcess<T = any>(
  params: {
    prompt: string
    options?: { conversationId?: string; parentMessageId?: string }
    signal?: GenericAbortSignal
    // 下载进度回调
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void },
) {
  // 获取系统配置消息（默认提示词等）
  const settingStore = useSettingStore()
  const authStore = useAuthStore()

  // 设置请求参数
  let data: Record<string, any> = {
    prompt: params.prompt,
    options: params.options,
  }
// 如果使用ChatGPTAPI，则设置系统消息、温度、top_p
  if (authStore.isChatGPTAPI) {
    data = {
      // 合并data与其他Open API请求字段
      ...data,
      systemMessage: settingStore.systemMessage,
      temperature: settingStore.temperature,
      top_p: settingStore.top_p,
    }
  }
// 返回一个指向/chat-process的POSt请求交给后端路由进行后续工作
  return post<T>({
    url: '/chat-process',
    data,
    signal: params.signal,
    onDownloadProgress: params.onDownloadProgress,
  })
}

export function fetchSession<T>() {
  return post<T>({
    url: '/session',
  })
}

export function fetchVerify<T>(token: string) {
  return post<T>({
    url: '/verify',
    data: { token },
  })
}
