import { defineStore } from 'pinia'
import {
  createArticle as apiCreateArticle,
  createArticleGroup as apiCreateArticleGroup,
  deleteArticle as apiDeleteArticle,
  deleteArticleGroup as apiDeleteArticleGroup,
  fetchArticleGroups,
  fetchArticles,
  updateArticle as apiUpdateArticle,
  updateArticleGroup as apiUpdateArticleGroup,
} from '@/api/compose'
import {
  articleFromApi,
  defaultState,
  findArticleById,
} from './helper'
import { useComposeTabStore } from '../composeTab'

export const useComposeStore = defineStore('compose-store', {
  state: (): Compose.ComposeState => ({
    ...defaultState(),
  }),

  getters: {
    defaultGroup(state: Compose.ComposeState) {
      return state.groups.find(group => group.isDefault) ?? null
    },

    sortedGroups(state: Compose.ComposeState) {
      return [...state.groups].sort((a, b) => {
        if (a.isDefault !== b.isDefault)
          return a.isDefault ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
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

    /** 将内容持久化到云端，并更新 Article 数据源 */
    async persistArticle(id: number, content: string, title?: string) {
      const article = this.findArticle(id)
      if (!article)
        throw new Error('文章不存在')

      const resolvedTitle = title ?? article.title ?? '未命名文章'
      await apiUpdateArticle(id, { content, title: resolvedTitle })
      article.content = content
      article.title = resolvedTitle
    },

    /** 页面初始化：拉取文章与分组列表，并重建页签 */
    async bootstrap(_force = false) {
      this.loading = true
      try {
        const [articlesRes, groupsRes] = await Promise.all([
          fetchArticles(),
          fetchArticleGroups(),
        ])

        this.articles = articlesRes.data.map(item => articleFromApi(item))
        this.groups = groupsRes.data

        useComposeTabStore().reconcileAfterBootstrap(this.articles)
      }
      finally {
        this.loading = false
      }
    },

    async ensureDefaultGroup() {
      if (this.defaultGroup)
        return this.defaultGroup

      await this.bootstrap(true)
      if (this.defaultGroup)
        return this.defaultGroup

      throw new Error('默认分组不存在')
    },

    async createArticle(content = '', title?: string, groupId?: string) {
      const group = groupId
        ? this.groups.find(item => item.id === groupId) ?? await this.ensureDefaultGroup()
        : await this.ensureDefaultGroup()

      const { data } = await apiCreateArticle({
        linkedGroupId: group.id,
        content,
        title,
      })
      await this.bootstrap()
      useComposeTabStore().openTab(data.id)
      return data
    },

    async removeArticle(id: number) {
      const tabStore = useComposeTabStore()
      await tabStore.closeTabIfOpen(id)

      await apiDeleteArticle(id)
      await this.bootstrap()
    },

    async createGroup(name: string) {
      const { data } = await apiCreateArticleGroup(name)
      this.groups.unshift(data)
      return data
    },

    async renameGroup(id: string, name: string) {
      const { data } = await apiUpdateArticleGroup(id, name)
      const index = this.groups.findIndex(group => group.id === id)
      if (index >= 0)
        this.groups[index] = data
      return data
    },

    /** 重命名文章（优先使用已打开页签的 draft 作为正文） */
    async renameArticle(id: number, title: string) {
      const article = this.findArticle(id)
      if (!article)
        throw new Error('文章不存在')

      const tabStore = useComposeTabStore()
      const tab = tabStore.findTab(id)
      const content = tab?.draft ?? article.content
      const resolvedTitle = title.trim() || '未命名文章'

      if (resolvedTitle === article.title && (!tab || resolvedTitle === tab.title))
        return

      if (tab)
        await tabStore.saveTab(id, content, resolvedTitle)
      else
        await this.persistArticle(id, content, resolvedTitle)
    },

    async removeGroup(id: string) {
      await apiDeleteArticleGroup(id)
      await this.bootstrap()
    },
  },
})
