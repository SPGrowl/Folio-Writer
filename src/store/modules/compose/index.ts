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
import { defaultState, getLocalState, setLocalActiveId } from './helper'

export const useComposeStore = defineStore('compose-store', {
  state: (): Compose.ComposeState => ({
    ...defaultState(),
    ...getLocalState(),
  }),

  getters: {
    activeArticle(state: Compose.ComposeState): Compose.Article | null {
      if (state.activeArticleId == null)
        return null
      return state.articles.find(article => article.id === state.activeArticleId) ?? null
    },

    articlesByGroup(state: Compose.ComposeState) {
      return (groupId: string) =>
        state.articles.filter(article => article.linkedGroup === groupId)
    },
  },

  actions: {
    recordActiveId() {
      setLocalActiveId(this.activeArticleId)
    },

    setActive(id: number | null) {
      this.activeArticleId = id
      this.recordActiveId()
    },

    resetSyncState() {
      this.syncState = 'saved'
      this.syncError = null
    },

    markDirty() {
      if (this.syncState !== 'loading')
        this.syncState = 'dirty'
    },

    async bootstrap(_force = false) {
      this.loading = true
      try {
        const [articlesRes, groupsRes] = await Promise.all([
          fetchArticles(),
          fetchArticleGroups(),
        ])

        this.articles = articlesRes.data
        this.groups = groupsRes.data

        if (
          this.activeArticleId != null
          && !this.articles.some(article => article.id === this.activeArticleId)
        ) {
          this.activeArticleId = null
        }
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
      this.setActive(data.id)
      return data
    },

    /** 仅发 PUT，不回写 articles，正文对齐走 bootstrap */
    async saveArticle(id: number, content: string, title?: string) {
      const article = this.articles.find(item => item.id === id)
      const resolvedTitle = title ?? article?.title ?? '未命名文章'

      this.syncState = 'loading'
      this.syncError = null

      try {
        await apiUpdateArticle(id, { content, title: resolvedTitle })
        this.syncState = 'saved'
      }
      catch (error) {
        this.syncState = 'failed'
        this.syncError = error instanceof ApiError ? error.message : '同步失败'
        throw error
      }
    },

    async removeArticle(id: number) {
      await apiDeleteArticle(id)
      await this.bootstrap()
      this.setActive(null)
    },

    async createGroup(name: string) {
      const { data } = await apiCreateArticleGroup(name)
      this.groups.unshift(data)
      return data
    },
  },
})
