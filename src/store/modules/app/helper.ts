import { ss } from '@/utils/storage'

const LOCAL_NAME = 'appSetting'

export type Theme = 'light' | 'dark' | 'auto'

export type Language = 'en-US' | 'es-ES' | 'ko-KR' | 'ru-RU' | 'vi-VN' | 'zh-CN' | 'zh-TW'

// 对应设置中的语言，主题等选项
const languageMap: { [key: string]: Language } = {
  'en': 'en-US',
  'en-US': 'en-US',
  'es': 'es-ES',
  'es-ES': 'es-ES',
  'ko': 'ko-KR',
  'ko-KR': 'ko-KR',
  'ru': 'ru-RU',
  'ru-RU': 'ru-RU',
  'vi': 'vi-VN',
  'vi-VN': 'vi-VN',
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
}

export interface AppState {
  siderCollapsed: boolean
  theme: Theme
  language: Language
  liteMode:boolean
}
export function defaultSetting(): AppState {
  const language = languageMap[navigator.language]
  return { siderCollapsed: false, theme: 'light', language ,liteMode:false}
}

export function getLocalSetting(): AppState {
  // 从本地存储中读取设置
  const localSetting: AppState | undefined = ss.get(LOCAL_NAME)
  // 覆盖属性，等价于：Object.assign({},defaultSetting(),localSetting)
  return { ...defaultSetting(), ...localSetting }
}

// 将设置存储到本地存储中
export function setLocalSetting(setting: AppState): void {
  // 形如：根据键名获取值
  // {key:LOCAL_NAME,value:setting}
  ss.set(LOCAL_NAME, setting)
}
