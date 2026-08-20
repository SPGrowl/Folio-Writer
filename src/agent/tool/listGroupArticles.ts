import { useComposeStore } from '@/store'
import { readArticleSnapshot } from './articleSource'
import { resolveGroupId } from './groupSource'

/** 根据分组 ID 返回组内文章目录（不含正文） */
export function executeListGroupArticles(
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
      wordCount: snapshot.wordCount,
      hasUnreviewedChanges: snapshot.hasUnreviewedChanges,
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
