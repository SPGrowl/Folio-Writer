import { useAgentStore } from '@/store'

export type ToolReviewStatus = 'pending' | 'accepted' | 'rejected' | 'superseded'

const ACCEPTED_MESSAGE = '用户已在编辑器采纳变更，draft 已更新。'
const REJECTED_MESSAGE = '用户已拒绝变更，articleChanges 已清除。'
const SUPERSEDED_MESSAGE = '已被更新的修改建议覆盖，不再待审。'

function parseToolContent(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  }
  catch {
    return null
  }
}

function mergeReviewIntoToolContent(
  content: string,
  reviewStatus: ToolReviewStatus,
  extra: Record<string, unknown> = {},
): string {
  const base = parseToolContent(content) ?? {}
  const message = reviewStatus === 'accepted'
    ? ACCEPTED_MESSAGE
    : reviewStatus === 'rejected'
      ? REJECTED_MESSAGE
      : reviewStatus === 'superseded'
        ? SUPERSEDED_MESSAGE
        : base.message

  return JSON.stringify({
    ...base,
    ...extra,
    reviewStatus,
    status: reviewStatus === 'pending' ? 'pending_user_review' : reviewStatus,
    draftUpdated: reviewStatus === 'accepted',
    message,
  })
}

/** 按 session + step index 回写写工具的审阅状态（step 不存在时静默失败） */
export function patchToolStepReviewStatus(
  sessionId: number | undefined,
  stepIndex: number | undefined,
  reviewStatus: ToolReviewStatus,
  extra: Record<string, unknown> = {},
): boolean {
  if (sessionId == null || stepIndex == null)
    return false

  const agentStore = useAgentStore()
  const session = agentStore.findSession(sessionId)
  if (!session)
    return false

  const step = session.steps[stepIndex]
  if (!step || step.role !== 'tool' || step.index !== stepIndex)
    return false

  if (step.toolName !== 'update_article_content')
    return false

  return agentStore.patchStepInSession(sessionId, stepIndex, {
    reviewStatus,
    content: mergeReviewIntoToolContent(step.content, reviewStatus, extra),
  })
}

export function markPendingToolSuperseded(
  sessionId: number | undefined,
  stepIndex: number | undefined,
): void {
  patchToolStepReviewStatus(sessionId, stepIndex, 'superseded')
}
