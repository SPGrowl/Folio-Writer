import { countMarkdownChars } from './countMarkdownChars'
import { buildUpdateArticlePayload } from './buildArticleReadPayload'
import { readArticleSnapshot, resolveArticleId } from './articleSource'

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
