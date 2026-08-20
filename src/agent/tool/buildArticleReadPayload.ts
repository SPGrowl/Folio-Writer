import type { ArticleReadResult } from './articleSource'

const PROPOSED_READ_HINT
  = '存在待用户审阅的修改建议（proposed）。draft 为当前正文（采纳前不变）；proposed 为 articleChanges 中的修改稿。后续 patch_article_content 的 oldText 必须从 proposed 原样复制。若 tool 回执 reviewStatus 为 pending，说明推送已成功，请勿重复提交。'

/** 组装 get_article_content 返回给 LLM 的 payload */
export function buildArticleReadPayload(read: ArticleReadResult): Record<string, unknown> {
  const base: Record<string, unknown> = {
    articleId: read.articleId,
    title: read.title,
    draftWordCount: read.draftWordCount,
    draft: {
      content: read.draftContent,
      wordCount: read.draftWordCount,
    },
    hasUnreviewedChanges: read.hasUnreviewedChanges,
  }

  if (read.hasUnreviewedChanges && read.proposedContent) {
    return {
      ...base,
      proposed: {
        content: read.proposedContent,
        wordCount: read.proposedWordCount,
      },
      message: PROPOSED_READ_HINT,
    }
  }

  return {
    ...base,
    content: read.draftContent,
    wordCount: read.draftWordCount,
  }
}

/** 组装 update_article_content 返回给 LLM 的 payload（不含正文，仅概述与状态） */
export function buildUpdateArticlePayload(
  articleId: number,
  title: string,
  wordCount: number,
  replacedExisting: boolean,
  summary?: string,
): Record<string, unknown> {
  const resolvedSummary = summary?.trim()
    || `已提交《${title}》全文修改建议，共 ${wordCount} 字`

  return {
    success: true,
    reviewStatus: 'pending',
    status: 'pending_user_review',
    articleId,
    title,
    wordCount,
    summary: resolvedSummary,
    draftUpdated: false,
    replacedExisting,
    message: '已写入 articleChanges，待用户在编辑器 diff 区审阅。正文请用 get_article_content 读取 draft / proposed。每次再改前必须先读正文。',
  }
}
