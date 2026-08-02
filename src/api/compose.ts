// src/api/compose.ts
import { get, post, put, del } from '@/utils/request'

/** 拉取全部文章（含 history） */
export function fetchArticles() {
  return get<Compose.Article[]>('/articles')
}

/** 新建文章 */
export function createArticle(data: {
  linkedGroupId: string
  content: string
  title?: string
  id?: number
}) {
  return post<Compose.Article>('/articles', data)
}

/** 更新文章（每次保存会追加一条 history） */
export function updateArticle(
  id: number,
  data: { title?: string; content: string },
) {
  return put<Compose.Article>(`/articles/${id}`, data)
}

/** 删除文章 */
export function deleteArticle(id: number) {
  return del<null>(`/articles/${id}`)
}

/** 拉取全部分组 */
export function fetchArticleGroups() {
  return get<Compose.ArticleGroup[]>('/article-groups')
}

/** 新建分组 */
export function createArticleGroup(name: string) {
  return post<Compose.ArticleGroup>('/article-groups', { name })
}

/** 更新分组名称 */
export function updateArticleGroup(id: string, name: string) {
  return put<Compose.ArticleGroup>(`/article-groups/${id}`, { name })
}

/** 删除分组（组内文章移至默认分组） */
export function deleteArticleGroup(id: string) {
  return del<null>(`/article-groups/${id}`)
}