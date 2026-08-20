import { buildArticleReadPayload } from './buildArticleReadPayload'
import { readArticleForAgent, resolveArticleId } from './articleSource'

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
