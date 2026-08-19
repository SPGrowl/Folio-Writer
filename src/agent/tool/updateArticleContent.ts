import { t } from '@/locales'
import { countMarkdownChars } from './countMarkdownChars'
import { buildUpdateArticlePayload } from './buildArticleReadPayload'
import { readArticleSnapshot, resolveArticleId, resolveArticleTitle } from './articleSource'

export function formatRunningUpdateArticleContent(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.update_article_content.running', {
    title: resolveArticleTitle(args, ctx),
  })
}

export function formatDoneUpdateArticleContent(
  args: Record<string, unknown>,
  result: AgentStep.ToolExecuteResult,
): string {
  const title = String(result.payload.title ?? resolveArticleTitle(args, null))
  return t('compose.agent.tools.update_article_content.done', { title })
}

export function formatErrorUpdateArticleContent(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.update_article_content.error', {
    title: resolveArticleTitle(args, ctx),
  })
}

/** 校验写工具参数并生成 tool 回执 payload（不写 changes，由 executeTools 写入） */
export function executeUpdateArticleContent(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const articleId = resolveArticleId(args)
  const rawContent = args.content
  if (typeof rawContent !== 'string')
    throw new Error('content 无效')

  const snapshot = readArticleSnapshot(articleId)
  const wordCount = countMarkdownChars(rawContent)
  const summary = typeof args.summary === 'string' ? args.summary : undefined

  return {
    payload: buildUpdateArticlePayload(
      articleId,
      snapshot.title,
      wordCount,
      snapshot.hasUnreviewedChanges,
      summary,
    ),
    meta: {
      articleId,
      content: rawContent,
    },
  }
}
