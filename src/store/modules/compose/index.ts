import { defineStore } from 'pinia'
import {
  createArticle as apiCreateArticle,
  createArticleGroup as apiCreateArticleGroup,
  deleteArticle as apiDeleteArticle,
  fetchArticleGroups,
  fetchArticles,
  updateArticle as apiUpdateArticle,
} from '@/api/compose'
import { ApiError } from '@/utils/request'
import {
  articleFromApi,
  attachDraft,
  collectPreservedTabState,
  defaultState,
  detachDraft,
  findArticleById,
  getLocalState,
  mergeArticleOnBootstrap,
  setLocalComposeUi,
} from './helper'

export const useComposeStore = defineStore('compose-store', {
  state: (): Compose.ComposeState => ({
    ...defaultState(),
    ...getLocalState(),
  }),

  getters: {
    activeArticle(state: Compose.ComposeState): Compose.Article | null {
      if (state.activeArticleId == null)
        return null
      return findArticleById(state, state.activeArticleId) ?? null
    },

    openArticles(state: Compose.ComposeState): Compose.Article[] {
      return state.openArticle
        .map(id => findArticleById(state, id))
        .filter((article): article is Compose.Article => article != null && article.draft !== undefined)
    },

    articlesByGroup(state: Compose.ComposeState) {
      return (groupId: string) =>
        state.articles.filter(article => article.linkedGroup === groupId)
    },
  },

  actions: {
    findArticle(id: number) {
      return findArticleById(this.$state, id)
    },

    recordUiState() {
      setLocalComposeUi({
        activeArticleId: this.activeArticleId,
        openArticle: this.openArticle,
      })
    },

    setActive(id: number | null) {
      this.activeArticleId = id
      this.recordUiState()
    },

    /** 编辑 draft 时标记该篇 dirty */
    markDirty(id: number) {
      const article = this.findArticle(id)
      if (!article || article.syncState === 'loading')
        return
      article.syncState = 'dirty'
    },

    /** 1. 打开文章：未在 openArticle 则 content→draft 并加入页签；设为活跃 ID */
    openTab(id: number) {
      const article = this.findArticle(id)
      if (!article)
        return

      if (!this.openArticle.includes(id)) {
        this.openArticle.push(id)
        const withDraft = attachDraft(article)
        Object.assign(article, withDraft)
      }

      this.setActive(id)
    },

    /** 3. 切换页签：仅更新并持久化 activeArticleId */
    switchTab(id: number) {
      if (!this.openArticle.includes(id))
        return
      this.setActive(id)
    },

    /**
     * 2. 关闭页签：未 saved 则同步 draft 到云端并写回 content，随后清空 draft
     */
    async closeTab(id: number) {
      const index = this.openArticle.indexOf(id)
      if (index === -1)
        return

      const article = this.findArticle(id)
      if (article?.draft !== undefined && article.syncState !== 'saved') {
        try {
          await this.saveArticle(id, article.draft, article.title)
        }
        catch {
          return
        }
      }

      if (article)
        Object.assign(article, detachDraft(article))

      this.openArticle.splice(index, 1)

      if (this.activeArticleId === id) {
        const nextId = this.openArticle[index] ?? this.openArticle[index - 1] ?? null
        this.setActive(nextId)
      }
      else {
        this.recordUiState()
      }
    },

    /**
     * 4. 将 draft 同步到云端；更新 content，并在该篇上维护 syncState
     */
    async saveArticle(id: number, content: string, title?: string) {
      const article = this.findArticle(id)
      if (!article)
        throw new Error('文章不存在')

      const resolvedTitle = title ?? article.title ?? '未命名文章'

      article.syncState = 'loading'
      article.syncError = null

      try {
        await apiUpdateArticle(id, { content, title: resolvedTitle })
        article.content = content
        if (article.draft !== undefined)
          article.draft = content
        article.syncState = 'saved'
        article.syncError = null
      }
      catch (error) {
        article.syncState = 'failed'
        article.syncError = error instanceof ApiError ? error.message : '同步失败'
        throw error
      }
    },

    /**
     * 5. 页面初始化：拉列表 + 为 openArticle 中的篇目生成 draft
     *    已打开且本地有 draft 的篇目保留本地状态（不强制从 content 覆盖）
     */
    async bootstrap(_force = false) {
      this.loading = true
      try {
        const preserved = collectPreservedTabState(this.$state)

        const [articlesRes, groupsRes] = await Promise.all([
          fetchArticles(),
          fetchArticleGroups(),
        ])

        const openIds = [...this.openArticle]

        this.articles = articlesRes.data.map(item =>
          mergeArticleOnBootstrap(
            articleFromApi(item),
            openIds,
            preserved,
          ),
        )
        this.groups = groupsRes.data

        const filteredOpen = openIds.filter(id =>
          this.articles.some(article => article.id === id),
        )
        this.$patch({ openArticle: filteredOpen })

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
      }
      finally {
        this.loading = false
      }
    },

    async ensureDefaultGroup() {
      if (this.groups.length)
        return this.groups[0]

      const { data } = await apiCreateArticleGroup('默认分组')
      this.groups.unshift(data)
      return data
    },

    async createArticle(content = '', title?: string) {
      const group = await this.ensureDefaultGroup()
      const { data } = await apiCreateArticle({
        linkedGroupId: group.id,
        content,
        title,
      })
      await this.bootstrap()
      this.openTab(data.id)
      return data
    },

    async removeArticle(id: number) {
      const index = this.openArticle.indexOf(id)
      if (index !== -1) {
        const article = this.findArticle(id)
        if (article?.draft !== undefined && article.syncState !== 'saved') {
          await this.saveArticle(id, article.draft, article.title).catch(() => {})
        }
        if (article)
          Object.assign(article, detachDraft(article))
        this.openArticle.splice(index, 1)
        if (this.activeArticleId === id) {
          const nextId = this.openArticle[index] ?? this.openArticle[index - 1] ?? null
          this.setActive(nextId)
        }
        else {
          this.recordUiState()
        }
      }

      await apiDeleteArticle(id)
      await this.bootstrap()
    },

    async createGroup(name: string) {
      const { data } = await apiCreateArticleGroup(name)
      this.groups.unshift(data)
      return data
    },

    /** 离开页面前保存所有未同步的打开页签 */
    async flushOpenTabsIfDirty() {
      for (const id of [...this.openArticle]) {
        const article = this.findArticle(id)
        if (article?.draft !== undefined && article.syncState !== 'saved') {
          await this.saveArticle(id, article.draft, article.title).catch(() => {})
        }
      }
    },
  },
})
