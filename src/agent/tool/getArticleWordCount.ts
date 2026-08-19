import { t } from '@/locales'
import {
  readArticleSnapshot,
  resolveArticleId,
  resolveArticleTitle,
} from './articleSource'

export function formatRunningGetArticleWordCount(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.get_article_word_count.running', {
    title: resolveArticleTitle(args, ctx),
  })
}

export function formatDoneGetArticleWordCount(
  _args: Record<string, unknown>,
  result: AgentStep.ToolExecuteResult,
): string {
  const title = String(result.payload.title ?? t('compose.untitled'))
  const count = Number(result.payload.wordCount ?? 0)
  return t('compose.agent.tools.get_article_word_count.done', { title, count })
}

export function formatErrorGetArticleWordCount(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): string {
  return t('compose.agent.tools.get_article_word_count.error', {
    title: resolveArticleTitle(args, ctx),
  })
}

/** 根据文章 ID 统计字数（优先使用已打开页签的 draft） */
export function executeGetArticleWordCount(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const articleId = resolveArticleId(args)
  const snapshot = readArticleSnapshot(articleId)

  return {
    payload: {
      articleId: snapshot.articleId,
      title: snapshot.title,
      wordCount: snapshot.wordCount,
    },
  }
}
