import { defineStore } from 'pinia'
import type { AppState, Language, SiderMode, Theme } from './helper'
import { getLocalSetting, setLocalSetting } from './helper'
import { store } from '@/store/helper'

export const useAppStore = defineStore('app-store', {
  state: (): AppState => getLocalSetting(),
  actions: {
    setSiderCollapsed(collapsed: boolean) {
      this.siderCollapsed = collapsed
      this.recordState()
    },

    setSiderMode(mode: SiderMode) {
      this.siderMode = mode
      this.recordState()
    },

    setTheme(theme: Theme) {
      this.theme = theme
      this.recordState()
    },

    setLanguage(language: Language) {
      if (this.language !== language) {
        this.language = language
        this.recordState()
				console.log(this.liteMode)
      }
    },
    setLiteMode() {
      this.recordState()
    },
    recordState() {
      setLocalSetting(this.$state)
    },
  },
})

export function useAppStoreWithOut() {
  return useAppStore(store)
}
