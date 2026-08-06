import { useComposeStore, useComposeTabStore } from '@/store'
import { countMarkdownChars } from './countMarkdownChars'

function resolveArticleId(args: Record<string, unknown>): number {
  const raw = args.article_id ?? args.articleId
  const id = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(id))
    throw new Error('article_id 无效')
  return id
}

/** 根据文章 ID 统计字数（优先使用已打开页签的 draft） */
export function executeGetArticleWordCount(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const articleId = resolveArticleId(args)
  const composeStore = useComposeStore()
  const tabStore = useComposeTabStore()

  const article = composeStore.findArticle(articleId)
  if (!article)
    throw new Error(`文章 ${articleId} 不存在`)

  const tab = tabStore.findTab(articleId)
  const content = tab?.draft ?? article.content
  const title = tab?.title ?? article.title
  const wordCount = countMarkdownChars(content)

  return {
    payload: {
      articleId,
      title,
      wordCount,
    },
    msg: `《${title}》`,
  }
}

export function msgGetArticleWordCount(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  const composeStore = useComposeStore()
  const tabStore = useComposeTabStore()

  const articleId = resolveArticleId(args)
  const tab = tabStore.findTab(articleId)
  if (tab?.title)
    return `《${tab.title}》`

  const article = composeStore.findArticle(articleId)
  if (article?.title)
    return `《${article.title}》`

  if (ctx?.articleId === articleId && ctx.title)
    return `《${ctx.title}》`

  return `文章 ${articleId}`
}
