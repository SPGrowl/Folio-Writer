import { useComposeStore, useComposeTabStore } from '@/store'
import { countMarkdownChars } from './countMarkdownChars'

export function resolveArticleId(args: Record<string, unknown>): number {
  const raw = args.article_id ?? args.articleId
  const id = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(id))
    throw new Error('article_id 无效')
  return id
}

export interface ArticleSnapshot {
  articleId: number
  title: string
  content: string
  wordCount: number
  hasUnreviewedChanges: boolean
}

/** Agent 读工具：draft + 可选 articleChanges 全文 */
export interface ArticleReadResult {
  articleId: number
  title: string
  draftContent: string
  draftWordCount: number
  hasUnreviewedChanges: boolean
  proposedContent?: string
  proposedWordCount?: number
}

export function readDraftContent(articleId: number): { title: string, draftContent: string } {
  const composeStore = useComposeStore()
  const tabStore = useComposeTabStore()

  const article = composeStore.findArticle(articleId)
  if (!article)
    throw new Error(`文章 ${articleId} 不存在`)

  const tab = tabStore.findTab(articleId)
  return {
    title: tab?.title ?? article.title,
    draftContent: tab?.draft ?? article.content,
  }
}

/** 读取文章快照（优先已打开页签的 draft / title） */
export function readArticleSnapshot(articleId: number): ArticleSnapshot {
  const read = readArticleForAgent(articleId)
  return {
    articleId: read.articleId,
    title: read.title,
    content: read.draftContent,
    wordCount: read.draftWordCount,
    hasUnreviewedChanges: read.hasUnreviewedChanges,
  }
}

/** 读取文章（含 articleChanges 待审稿，供 Agent 读工具使用） */
export function readArticleForAgent(articleId: number): ArticleReadResult {
  const tabStore = useComposeTabStore()
  const { title, draftContent } = readDraftContent(articleId)
  const change = tabStore.getChanges(articleId)
  const proposedContent = change?.content?.trim() || undefined

  return {
    articleId,
    title,
    draftContent,
    draftWordCount: countMarkdownChars(draftContent),
    hasUnreviewedChanges: Boolean(proposedContent),
    proposedContent,
    proposedWordCount: proposedContent ? countMarkdownChars(proposedContent) : undefined,
  }
}

export function resolveArticleTitle(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  try {
    const articleId = resolveArticleId(args)
    const snapshot = readArticleSnapshot(articleId)
    return snapshot.title
  }
  catch {
    if (ctx?.title)
      return ctx.title
  }

  return '未命名文章'
}
