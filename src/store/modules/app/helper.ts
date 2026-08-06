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

export type SiderMode = 'chat' | 'compose'

/** Agent 侧栏参与 flex 布局的基础宽度（默认宽 / 拖拽下限）；超出部分 overlay */
export const AGENT_SIDEBAR_LAYOUT_WIDTH = 300

/** 侧栏拉满时留给编辑区的最小可视宽度 */
export const AGENT_SIDEBAR_MIN_EDITOR_VISIBLE = 200

export interface AppState {
  siderCollapsed: boolean
  siderMode: SiderMode
  agentSidebarCollapsed: boolean
  agentSidebarWidth: number
  theme: Theme
  language: Language
  liteMode:boolean
}
export function defaultSetting(): AppState {
  const language = languageMap[navigator.language]
  return {
    siderCollapsed: false,
    siderMode: 'chat',
    agentSidebarCollapsed: false,
    agentSidebarWidth: AGENT_SIDEBAR_LAYOUT_WIDTH,
    theme: 'light',
    language,
    liteMode: false,
  }
}

export function getLocalSetting(): AppState {
  const localSetting: AppState | undefined = ss.get(LOCAL_NAME)
  const merged = { ...defaultSetting(), ...localSetting }
  if (merged.agentSidebarWidth < AGENT_SIDEBAR_LAYOUT_WIDTH)
    merged.agentSidebarWidth = AGENT_SIDEBAR_LAYOUT_WIDTH
  return merged
}

// 将设置存储到本地存储中
export function setLocalSetting(setting: AppState): void {
  // 形如：根据键名获取值
  // {key:LOCAL_NAME,value:setting}
  ss.set(LOCAL_NAME, setting)
}
