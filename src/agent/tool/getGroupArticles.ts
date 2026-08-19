import { useComposeStore } from '@/store'
import { t } from '@/locales'
import { readArticleSnapshot } from './articleSource'
import { resolveGroupId, resolveGroupMeta } from './groupSource'

export function formatRunningGetGroupArticles(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  const { groupName, count } = resolveGroupMeta(args, ctx)
  return t('compose.agent.tools.get_group_articles.running', { groupName, count })
}

export function formatDoneGetGroupArticles(
  _args: Record<string, unknown>,
  result: AgentStep.ToolExecuteResult,
): string {
  const groupName = String(result.payload.groupName ?? t('compose.agent.toolDefaultTarget'))
  const count = Number(result.payload.count ?? 0)
  return t('compose.agent.tools.get_group_articles.done', { groupName, count })
}

export function formatErrorGetGroupArticles(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  const { groupName } = resolveGroupMeta(args, ctx)
  return t('compose.agent.tools.get_group_articles.error', { groupName })
}

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
