import { ss } from '@/utils/storage'

const LOCAL_NAME = 'appSetting'

export type Theme = 'light' | 'dark' | 'auto'

export type Language = 'zh-CN'

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
}

export function defaultSetting(): AppState {
  return {
    siderCollapsed: false,
    siderMode: 'chat',
    agentSidebarCollapsed: false,
    agentSidebarWidth: AGENT_SIDEBAR_LAYOUT_WIDTH,
    theme: 'light',
    language: 'zh-CN',
  }
}

export function getLocalSetting(): AppState {
  const localSetting: AppState | undefined = ss.get(LOCAL_NAME)
  const merged = { ...defaultSetting(), ...localSetting }
  // 历史多语言设置统一收敛为简体中文
  merged.language = 'zh-CN'
  // 丢弃历史 liteMode 字段
  delete (merged as AppState & { liteMode?: boolean }).liteMode
  if (merged.agentSidebarWidth < AGENT_SIDEBAR_LAYOUT_WIDTH)
    merged.agentSidebarWidth = AGENT_SIDEBAR_LAYOUT_WIDTH
  return merged
}

// 将设置存储到本地存储中
export function setLocalSetting(setting: AppState): void {
  ss.set(LOCAL_NAME, setting)
}
