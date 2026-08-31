import { ss } from '@/utils/storage'

const LOCAL_NAME = 'settingsStorage'

export interface SettingsState {
  systemMessage: string
  temperature: number
  top_p: number
	modelName: string
}

// 对应高级设置
export function defaultSetting(): SettingsState {
  return {
    systemMessage: 'You are a helpful LLM assistant.',
    temperature: 0.8,
    top_p: 1,
		modelName: 'deepseek-v4-pro'
  }
}

export function getLocalState(): SettingsState {
  const localSetting = ss.get(LOCAL_NAME)
  if (!localSetting)
    return defaultSetting()
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: SettingsState): void {
  ss.set(LOCAL_NAME, setting)
}

export function removeLocalState() {
  ss.remove(LOCAL_NAME)
}
