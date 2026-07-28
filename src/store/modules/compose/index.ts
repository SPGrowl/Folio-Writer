import { defineStore } from 'pinia'
import {
  createArticle as apiCreateArticle,
  createArticleGroup as apiCreateArticleGroup,
  deleteArticle as apiDeleteArticle,
  fetchArticleGroups,
  fetchArticles,
  updateArticle as apiUpdateArticle,
} from '@/api/compose'
import { defaultState, getLocalState, setLocalActiveId } from './helper'

function findArticleIndex(articles: Compose.Article[], id: number) {
  return articles.findIndex(article => article.id === id)
}

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

    async bootstrap(force = false) {
      if (this.loading)
        return
      if (!force && this.articles.length && this.groups.length)
        return

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

        if (this.activeArticleId == null && this.articles.length)
          this.activeArticleId = this.articles[0].id

        this.recordActiveId()
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

      this.articles.unshift(data)

      const targetGroup = this.groups.find(item => item.id === group.id)
      if (targetGroup && !targetGroup.articleIds.includes(data.id))
        targetGroup.articleIds.push(data.id)

      this.setActive(data.id)
      return data
    },

    async saveArticle(id: number, patch: { title?: string, content: string }) {
      this.saving = true
      try {
        const { data } = await apiUpdateArticle(id, patch)
        const index = findArticleIndex(this.articles, id)
        if (index !== -1)
          this.articles[index] = data
        return data
      }
      finally {
        this.saving = false
      }
    },

    async removeArticle(id: number) {
      await apiDeleteArticle(id)

      const index = findArticleIndex(this.articles, id)
      if (index !== -1)
        this.articles.splice(index, 1)

      this.groups.forEach((group) => {
        group.articleIds = group.articleIds.filter(articleId => articleId !== id)
      })
      this.groups = this.groups.filter(group => group.articleIds.length > 0)

      if (this.activeArticleId === id)
        this.setActive(this.articles[0]?.id ?? null)
    },

    async createGroup(name: string) {
      const { data } = await apiCreateArticleGroup(name)
      this.groups.unshift(data)
      return data
    },
  },
})
