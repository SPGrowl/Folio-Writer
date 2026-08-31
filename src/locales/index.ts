import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import { useAppStoreWithOut } from '@/store/modules/app'
import type { Language } from '@/store/modules/app/helper'

const appStore = useAppStoreWithOut()

const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  allowComposition: true,
  messages: {
    'zh-CN': zhCN,
  },
})

export const t = i18n.global.t

export function setLocale(_locale: Language) {
  i18n.global.locale = 'zh-CN'
  if (appStore.language !== 'zh-CN')
    appStore.setLanguage('zh-CN')
}

export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
