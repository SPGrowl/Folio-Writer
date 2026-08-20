import { readArticleSnapshot, resolveArticleId } from './articleSource'

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
