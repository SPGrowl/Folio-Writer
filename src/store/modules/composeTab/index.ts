import { defineStore } from 'pinia'
import { ApiError } from '@/utils/request'
import {
  markPendingToolSuperseded,
  patchToolStepReviewStatus,
} from '@/agent/review/syncToolReviewStatus'
import { useComposeStore } from '../compose'
import {
  collectPreservedTabs,
  createTabFromArticle,
  defaultTabState,
  findTabById,
  getLocalTabState,
  mergeTabOnBootstrap,
  migrateLegacyTabChanges,
  setLocalTabUi,
} from './helper'

function hasChangePayload(change?: Compose.ArticleChange): boolean {
  return Boolean(change?.content != null && change.content !== '')
}

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

    hasPendingChanges(state: Compose.TabState) {
      return (id: number) => hasChangePayload(state.articleChanges[id])
    },

    getChanges(state: Compose.TabState) {
      return (id: number): Compose.ArticleChange | undefined => {
        const change = state.articleChanges[id]
        return hasChangePayload(change) ? change : undefined
      }
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
        articleChanges: this.articleChanges,
      })
    },

    setActive(id: number | null) {
      this.activeArticleId = id
      this.recordUiState()
    },

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

    /** Agent 写工具：写入全局 articleChanges（单槽，新推送覆盖旧稿） */
    applyAgentChanges(
      id: number,
      content: string,
      source?: Pick<Compose.ArticleChange, 'sourceToolStepIndex' | 'sourceSessionId'>,
    ) {
      const composeStore = useComposeStore()
      if (!composeStore.findArticle(id))
        throw new Error(`文章 ${id} 不存在`)

      const existing = this.getChanges(id)
      if (existing?.sourceToolStepIndex != null) {
        markPendingToolSuperseded(
          existing.sourceSessionId,
          existing.sourceToolStepIndex,
        )
      }

      this.articleChanges[id] = {
        content,
        ...source,
      }

      this.recordUiState()
    },

    clearChanges(id: number) {
      if (!(id in this.articleChanges))
        return
      delete this.articleChanges[id]
      this.recordUiState()
    },

    clearPendingChanges(id: number) {
      this.clearChanges(id)
    },

    /** 采纳：写入 draft（或 Article 内存），并从 map 移除 */
    acceptChanges(id: number) {
      const changes = this.getChanges(id)
      if (!changes)
        return

      patchToolStepReviewStatus(
        changes.sourceSessionId,
        changes.sourceToolStepIndex,
        'accepted',
      )

      delete this.articleChanges[id]

      const tab = this.findTab(id)
      if (tab) {
        tab.draft = changes.content
        this.markDirty(id)
      }
      else {
        const article = useComposeStore().findArticle(id)
        if (article)
          article.content = changes.content
      }

      this.recordUiState()
    },

    /** 拒绝：回写 tool 状态并从 map 移除 */
    rejectChanges(id: number) {
      const changes = this.getChanges(id)

      patchToolStepReviewStatus(
        changes?.sourceSessionId,
        changes?.sourceToolStepIndex,
        'rejected',
      )

      this.clearChanges(id)
    },

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

    switchTab(id: number) {
      if (!this.openTabs.includes(id))
        return
      this.setActive(id)
    },

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

    reconcileAfterBootstrap(articles: Compose.Article[]) {
      const preserved = collectPreservedTabs(this.$state)
      const openIds = [...this.openTabs]
      let articleChanges = migrateLegacyTabChanges(
        preserved,
        { ...this.articleChanges },
      )

      const nextTabs: Record<number, Compose.Tab> = {}
      for (const article of articles) {
        const tab = mergeTabOnBootstrap(article, openIds, preserved)
        if (tab)
          nextTabs[article.id] = tab
      }

      const filteredOpen = openIds.filter(id => nextTabs[id] != null)
      this.tabs = nextTabs
      this.openTabs = filteredOpen
      this.articleChanges = articleChanges

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

    async closeTabIfOpen(id: number) {
      this.clearChanges(id)

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
