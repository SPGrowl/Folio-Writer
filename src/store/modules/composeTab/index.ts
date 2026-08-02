import { defineStore } from 'pinia'
import { ApiError } from '@/utils/request'
import { useComposeStore } from '../compose'
import {
  collectPreservedTabs,
  createTabFromArticle,
  defaultTabState,
  findTabById,
  getLocalTabState,
  mergeTabOnBootstrap,
  setLocalTabUi,
} from './helper'

export const useComposeTabStore = defineStore('compose-tab-store', {
  state: (): Compose.TabState => ({
    ...defaultTabState(),
    ...getLocalTabState(),
  }),

  getters: {
    activeTab(state: Compose.TabState): Compose.Tab | null {
      if (state.activeArticleId == null)
        return null
      return findTabById(state, state.activeArticleId) ?? null
    },

    openTabList(state: Compose.TabState): Compose.Tab[] {
      return state.openTabs
        .map(id => state.tabs[id])
        .filter((tab): tab is Compose.Tab => tab != null)
    },

    isTabOpen(state: Compose.TabState) {
      return (id: number) => state.openTabs.includes(id)
    },
  },

  actions: {
    findTab(id: number) {
      return findTabById(this.$state, id)
    },

    recordUiState() {
      setLocalTabUi({
        openTabs: this.openTabs,
        activeArticleId: this.activeArticleId,
      })
    },

    setActive(id: number | null) {
      this.activeArticleId = id
      this.recordUiState()
    },

    /** 编辑 draft 时标记该页签 dirty */
    markDirty(id: number) {
      const tab = this.findTab(id)
      if (!tab || tab.syncState === 'loading')
        return
      tab.syncState = 'dirty'
    },

    setDraft(id: number, draft: string) {
      const tab = this.findTab(id)
      if (!tab)
        return
      tab.draft = draft
      this.markDirty(id)
    },

    setChanges(id: number, changes: Compose.TabChanges) {
      const tab = this.findTab(id)
      if (!tab)
        return
      tab.changes = changes
    },

    clearChanges(id: number) {
      const tab = this.findTab(id)
      if (!tab)
        return
      delete tab.changes
    },

    /** 采纳 LLM 变更：将 changes.content 写入 draft 并清除 changes */
    acceptChanges(id: number) {
      const tab = this.findTab(id)
      if (!tab?.changes?.content)
        return
      tab.draft = tab.changes.content
      this.markDirty(id)
      delete tab.changes
    },

    /** 拒绝 LLM 变更：清除 changes */
    rejectChanges(id: number) {
      this.clearChanges(id)
    },

    /** 打开文章：未在 openTabs 则从 Article 创建 Tab；设为活跃 */
    openTab(id: number) {
      const composeStore = useComposeStore()
      const article = composeStore.findArticle(id)
      if (!article)
        return

      if (!this.openTabs.includes(id)) {
        this.openTabs.push(id)
        this.tabs[id] = createTabFromArticle(article)
      }

      this.setActive(id)
    },

    /** 切换页签：仅更新 activeArticleId */
    switchTab(id: number) {
      if (!this.openTabs.includes(id))
        return
      this.setActive(id)
    },

    /** 关闭页签：未 saved 则同步 draft 到云端，随后移除 Tab */
    async closeTab(id: number) {
      const index = this.openTabs.indexOf(id)
      if (index === -1)
        return

      const tab = this.findTab(id)
      if (tab && tab.syncState !== 'saved') {
        try {
          await this.saveTab(id, tab.draft, tab.title)
        }
        catch {
          return
        }
      }

      this.openTabs.splice(index, 1)
      delete this.tabs[id]

      if (this.activeArticleId === id) {
        const nextId = this.openTabs[index] ?? this.openTabs[index - 1] ?? null
        this.setActive(nextId)
      }
      else {
        this.recordUiState()
      }
    },

    /** 将 draft 同步到云端，并更新 Article 与 Tab 状态 */
    async saveTab(id: number, content: string, title?: string) {
      const composeStore = useComposeStore()
      const article = composeStore.findArticle(id)
      const tab = this.findTab(id)
      if (!article || !tab)
        throw new Error('文章或页签不存在')

      const resolvedTitle = title ?? tab.title ?? article.title ?? '未命名文章'

      tab.syncState = 'loading'
      tab.syncError = null

      try {
        await composeStore.persistArticle(id, content, resolvedTitle)
        tab.draft = content
        tab.title = resolvedTitle
        tab.syncState = 'saved'
        tab.syncError = null
      }
      catch (error) {
        tab.syncState = 'failed'
        tab.syncError = error instanceof ApiError ? error.message : '同步失败'
        throw error
      }
    },

    /** compose bootstrap 完成后重建 tabs */
    reconcileAfterBootstrap(articles: Compose.Article[]) {
      const preserved = collectPreservedTabs(this.$state)
      const openIds = [...this.openTabs]

      const nextTabs: Record<number, Compose.Tab> = {}
      for (const article of articles) {
        const tab = mergeTabOnBootstrap(article, openIds, preserved)
        if (tab)
          nextTabs[article.id] = tab
      }

      const filteredOpen = openIds.filter(id => nextTabs[id] != null)
      this.tabs = nextTabs
      this.openTabs = filteredOpen

      if (filteredOpen.length === 0) {
        this.activeArticleId = null
      }
      else if (
        this.activeArticleId == null
        || !filteredOpen.includes(this.activeArticleId)
      ) {
        this.activeArticleId = filteredOpen[filteredOpen.length - 1]
      }

      this.recordUiState()
    },

    /** 关闭指定文章的页签（删除文章时） */
    async closeTabIfOpen(id: number) {
      if (!this.openTabs.includes(id))
        return

      const tab = this.findTab(id)
      if (tab && tab.syncState !== 'saved') {
        await this.saveTab(id, tab.draft, tab.title).catch(() => {})
      }

      const index = this.openTabs.indexOf(id)
      this.openTabs.splice(index, 1)
      delete this.tabs[id]

      if (this.activeArticleId === id) {
        const nextId = this.openTabs[index] ?? this.openTabs[index - 1] ?? null
        this.setActive(nextId)
      }
      else {
        this.recordUiState()
      }
    },

    /** 离开页面前保存所有未同步的打开页签 */
    async flushOpenTabsIfDirty() {
      for (const id of [...this.openTabs]) {
        const tab = this.findTab(id)
        if (tab && tab.syncState !== 'saved') {
          await this.saveTab(id, tab.draft, tab.title).catch(() => {})
        }
      }
    },
  },
})
