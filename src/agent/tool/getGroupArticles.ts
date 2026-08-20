import { useComposeStore } from '@/store'
import { readArticleSnapshot } from './articleSource'
import { resolveGroupId } from './groupSource'

/** 根据分组 ID 返回整组文章的 ID、标题与正文（优先使用已打开页签的 draft） */
export function executeGetGroupArticles(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const groupId = resolveGroupId(args)
  const composeStore = useComposeStore()

  const group = composeStore.groups.find(item => item.id === groupId)
  if (!group)
    throw new Error(`分组 ${groupId} 不存在`)

  const articles = composeStore.articlesByGroup(groupId).map((article) => {
    const snapshot = readArticleSnapshot(article.id)
    return {
      articleId: snapshot.articleId,
      title: snapshot.title,
      content: snapshot.content,
    }
  })

  return {
    payload: {
      groupId,
      groupName: group.name,
      count: articles.length,
      articles,
    },
  }
}
