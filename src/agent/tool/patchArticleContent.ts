import { countMarkdownChars } from './countMarkdownChars'
import { buildContentFromEdits } from './applyTextEdits'
import { buildUpdateArticlePayload } from './buildArticleReadPayload'
import { readArticleForAgent, resolveArticleId } from './articleSource'

/** 校验 edits，基于 draft/proposed 拼出完整正文（不写 changes，由 executeTools 写入） */
export function executePatchArticleContent(
  args: Record<string, unknown>,
): AgentStep.ToolExecuteResult {
  const articleId = resolveArticleId(args)
  const read = readArticleForAgent(articleId)
  const base = read.proposedContent ?? read.draftContent
  const fullContent = buildContentFromEdits(base, args.edits)
  const wordCount = countMarkdownChars(fullContent)
  const editCount = Array.isArray(args.edits) ? args.edits.length : 0
  const summary = typeof args.summary === 'string'
    ? args.summary
    : `已提交《${read.title}》局部修改（${editCount} 处），全文共 ${wordCount} 字`

  return {
    payload: {
      ...buildUpdateArticlePayload(
        articleId,
        read.title,
        wordCount,
        read.hasUnreviewedChanges,
        summary,
      ),
      kind: 'patch',
      editCount,
    },
    meta: {
      articleId,
      content: fullContent,
    },
  }
}
