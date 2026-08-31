import { post } from '@/utils/request'
import { streamChatProcess, type StreamChatOptions } from '@/utils/stream/openai'
import { useSettingStore } from '@/store'

// ========== 以下为旧版 chatgpt 库协议，已废弃，保留备查 ==========

// export function fetchChatAPI<T = any>(
//   prompt: string,
//   options?: { conversationId?: string; parentMessageId?: string },
//   signal?: GenericAbortSignal,
// ) {
//   return post<T>({
//     url: '/chat',
//     data: { prompt, options },
//     signal,
//   })
// }

// export function fetchChatAPIProcess<T = any>(
//   params: {
//     prompt: string
//     options?: { conversationId?: string; parentMessageId?: string }
//     signal?: GenericAbortSignal
//     onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
//   },
// ) {
//   const settingStore = useSettingStore()
//   const authStore = useAuthStore()
//   let data: Record<string, any> = {
//     prompt: params.prompt,
//     options: params.options,
//   }
//   if (authStore.isChatGPTAPI) {
//     data = {
//       ...data,
//       systemMessage: settingStore.systemMessage,
//       temperature: settingStore.temperature,
//       top_p: settingStore.top_p,
//       model: settingStore.modelName,
//     }
//   }
//   return post<T>({
//     url: '/chat-process',
//     data,
//     signal: params.signal,
//     onDownloadProgress: params.onDownloadProgress,
//   })
// }

// ========== 新版 OpenAI 标准流式请求 ==========

/**
 * 组合 OpenAI 请求体并发起 SSE 流式对话。
 * messages 由 sessionStore.composeRequest 生成。
 */
export function submitRequestBody(
  messages: OpenAI.Message[],
  options: StreamChatOptions,
) {
  const settingStore = useSettingStore()
  const data: OpenAI.OpenAIRequest = {
    model: settingStore.modelName,
    messages,
    temperature: settingStore.temperature,
    top_p: settingStore.top_p,
    extra_body: {
      thinking: { type: 'enabled' },
    },
    reasoning_effort: 'high',
    stream: true,
  }
  return streamChatProcess(data, options)
}

export function fetchSession<T>() {
  return post<T>('/session')
}

export function fetchVerify<T>(token: string) {
  return post<T>('/verify', { token })
}
