import { useComposeStore } from '../compose'
import { useComposeTabStore } from '../composeTab'

/** 工具注册表条目：API 函数名 → UI 展示与摘要格式化 */
export interface AgentToolRegistryEntry {
  displayName: string
  formatParams?: (args: Record<string, unknown>) => string
  formatResult?: (result: Record<string, unknown>) => string
}

export const AGENT_TOOL_REGISTRY: Record<string, AgentToolRegistryEntry> = {
  get_article_word_count: {
    displayName: '查询文章字数',
    formatParams: args => `文章 ID ${args.article_id ?? '?'}`,
    formatResult: result => `${result.wordCount ?? 0} 字（${result.title ?? ''}）`,
  },
}

/**
 * 统计 Markdown 正文字数（去空白字符后的字符数，适用于中英文混排）。
 */
export function countArticleWords(content: string): number {
  return content.replace(/\s/g, '').length
}

/**
 * 根据文章 ID 查询字数。
 * 优先读 composeStore 中的持久化 content；若该文章正在编辑，则使用页签 draft。
 */
export function getArticleWordCount(articleId: number): Record<string, unknown> {
  const composeStore = useComposeStore()
  const article = composeStore.findArticle(articleId)

  if (!article)
    throw new Error(`文章不存在：ID ${articleId}`)

  // 若文章在页签中打开，使用最新 draft；否则用 store 中的 content
  const tab = useComposeTabStore().findTab(articleId)
  const content = tab?.draft ?? article.content
  const wordCount = countArticleWords(content)

  return {
    articleId,
    title: article.title,
    wordCount,
    charCount: content.length,
  }
}

/** 流式响应中累积的 assistant 消息（含 tool_calls 分片） */
export interface PendingAssistantMessage {
  reasoning: string
  content: string
  toolCalls: Record<number, { id?: string; name?: string; arguments: string }>
}

export function createPendingAssistant(): PendingAssistantMessage {
  return { reasoning: '', content: '', toolCalls: {} }
}

/** 将 SSE delta 追加到 PendingAssistantMessage */
export function applyAssistantDelta(
  pending: PendingAssistantMessage,
  delta: AgentApi.StreamDelta,
) {
  if (delta.reasoning_content)
    pending.reasoning += delta.reasoning_content

  if (delta.content)
    pending.content += delta.content

  if (delta.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index ?? 0
      pending.toolCalls[idx] ??= { arguments: '' }
      if (tc.id)
        pending.toolCalls[idx].id = tc.id
      if (tc.function?.name)
        pending.toolCalls[idx].name = tc.function.name
      if (tc.function?.arguments)
        pending.toolCalls[idx].arguments += tc.function.arguments
    }
  }
}

/** 将累积结果转为可发送给 API 的 assistant Message */
export function finalizeAssistantMessage(
  pending: PendingAssistantMessage,
): AgentApi.Message {
  const toolCallList = Object.keys(pending.toolCalls)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => {
      const tc = pending.toolCalls[Number(key)]
      return {
        id: tc.id ?? `pending_${key}`,
        type: 'function' as const,
        function: {
          name: tc.name ?? '',
          arguments: tc.arguments,
        },
      }
    })
    .filter(tc => tc.function.name)

  const message: AgentApi.Message = {
    role: 'assistant',
    content: pending.content,
  }

  if (pending.reasoning)
    message.reasoning_content = pending.reasoning

  if (toolCallList.length)
    message.tool_calls = toolCallList

  return message
}

/**
 * 执行 Agent 工具调用。
 * @returns payload 作为 tool role 消息 content 回传 LLM；摘要供 UI 展示
 */
export function executeAgentTool(
  toolName: string,
  argsJson: string,
): { payload: Record<string, unknown>; paramsSummary: string; resultSummary: string } {
  const args = JSON.parse(argsJson) as Record<string, unknown>
  const registry = AGENT_TOOL_REGISTRY[toolName]
  const paramsSummary = registry?.formatParams?.(args) ?? argsJson.slice(0, 40)

  switch (toolName) {
    case 'get_article_word_count': {
      const articleId = Number(args.article_id)
      if (!Number.isFinite(articleId))
        throw new Error('article_id 必须是数字')

      const payload = getArticleWordCount(articleId) as Record<string, unknown>
      const resultSummary = registry?.formatResult?.(payload) ?? JSON.stringify(payload)
      return { payload, paramsSummary, resultSummary }
    }
    default:
      throw new Error(`未知工具：${toolName}`)
  }
}

/** 流式阶段根据 tool_calls 分片更新 UI  invocation（status=calling） */
export function syncInvocationFromDelta(
  step: Agent.RunStep,
  delta: AgentApi.StreamDelta,
  displayNameOf: (name: string) => string,
) {
  if (!delta.tool_calls)
    return

  for (const tc of delta.tool_calls) {
    const idx = tc.index ?? 0
    const name = tc.function?.name
    if (!name)
      continue

    const id = tc.id ?? `pending-${idx}`
    let inv = step.invocations.find(item => item.id === id)
    if (!inv) {
      inv = {
        id,
        name,
        displayName: displayNameOf(name),
        status: 'calling',
        paramsSummary: '',
      }
      step.invocations.push(inv)
    }

    if (tc.function?.arguments) {
      try {
        const partial = inv.paramsSummary + tc.function.arguments
        const parsed = JSON.parse(partial) as Record<string, unknown>
        inv.paramsSummary = AGENT_TOOL_REGISTRY[name]?.formatParams?.(parsed)
          ?? partial.slice(0, 40)
      }
      catch {
        inv.paramsSummary = (inv.paramsSummary + tc.function.arguments).slice(0, 40)
      }
    }
  }
}
