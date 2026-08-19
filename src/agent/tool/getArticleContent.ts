import { t } from '@/locales'
import { buildArticleReadPayload } from './buildArticleReadPayload'
import {
  readArticleForAgent,
  resolveArticleId,
  resolveArticleTitle,
} from './articleSource'

export function formatRunningGetArticleContent(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.get_article_content.running', {
    title: resolveArticleTitle(args, ctx),
  })
}

export function formatDoneGetArticleContent(
  _args: Record<string, unknown>,
  result: AgentStep.ToolExecuteResult,
): string {
  const title = String(result.payload.title ?? t('compose.untitled'))
  const count = Number(result.payload.draftWordCount ?? result.payload.wordCount ?? 0)
  const pending = Boolean(result.payload.hasUnreviewedChanges)
  if (pending)
    return t('compose.agent.tools.get_article_content.doneWithPending', { title, count })
  return t('compose.agent.tools.get_article_content.done', { title, count })
}

export function formatErrorGetArticleContent(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.get_article_content.error', {
    title: resolveArticleTitle(args, ctx),
  })
}

/** 根据文章 ID 返回 draft；若有待审 changes 一并返回 pending */
export function executeGetArticleContent(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const articleId = resolveArticleId(args)
  const read = readArticleForAgent(articleId)

  return {
    payload: buildArticleReadPayload(read),
  }
}
