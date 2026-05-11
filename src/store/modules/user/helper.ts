import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
}

export interface UserState {
  userInfo: UserInfo
}

// 对应设置中的用户信息等字段
export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: 'https://raw.githubusercontent.com/Chanzhaoyu/chatgpt-web/main/src/assets/avatar.jpg',
      name: 'ChenZhaoYu',
      description: 'Star on <a href="https://github.com/Chanzhaoyu/chatgpt-bot" class="text-blue-500" target="_blank" >GitHub</a>',
    },
  }
}

// 从本地存储中读取设置
export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
