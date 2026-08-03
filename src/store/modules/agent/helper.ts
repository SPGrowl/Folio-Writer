
import { t } from '@/locales'

const SESSION_TITLE_MAX_LENGTH = 20

export function defaultState(): Agent.State {
  const session = createEmptySession()
  return {
    sessions: [session],
    activeSessionId: session.id,
    running: { sessionId: null, turnIndex: null },
  }
}

export function createEmptySession(mode: Agent.Mode = 'agent'): Agent.Session {
  const id = Date.now()
  return {
    id,
    title: t('compose.agent.newTabTitle', { n: 1 }),
    mode,
    turns: [],
    documentContext: null,
    createTime: new Date().toISOString(),
  }
}

export function createRun(): Agent.Run {
  return {
    status: 'idle',
    steps: [],
    finalText: null,
  }
}

export function createRunStep(stepIndex: number): Agent.RunStep {
  return {
    stepIndex,
    invocations: [],
  }
}

export function createTurn(turnIndex: number, text: string): Agent.Turn {
  return {
    turnIndex,
    user: {
      role: 'user',
      text,
      dateTime: new Date().toISOString(),
    },
    run: createRun(),
  }
}

export function setSessionTitle(prompt: string) {
  const text = prompt.trim().replace(/\s+/g, ' ')
  if (!text)
    return t('compose.agent.newTabTitle', { n: 1 })
  if (text.length <= SESSION_TITLE_MAX_LENGTH)
    return text
  return `${text.slice(0, SESSION_TITLE_MAX_LENGTH)}...`
}

export function findSessionIndex(sessions: Agent.Session[], id: number) {
  return sessions.findIndex(item => item.id === id)
}

export function findSessionById(sessions: Agent.Session[], id: number) {
  return sessions.find(item => item.id === id)
}

export function findTurn(session: Agent.Session, turnIndex: number) {
  return session.turns.find(item => item.turnIndex === turnIndex)
}

export function getCurrentRunStep(run: Agent.Run): Agent.RunStep {
  const last = run.steps[run.steps.length - 1]
  if (last)
    return last
  const step = createRunStep(0)
  run.steps.push(step)
  return step
}

export function buildSystemPrompt(session: Agent.Session): string {
  const doc = session.documentContext
  const docBlock = doc
    ? `\n\n【当前文档】\n分组：${doc.groupName || '未分组'}\n标题：${doc.title}\n\n${doc.content}`
    : '\n\n【当前文档】\n（无活跃文章）'

  if (session.mode === 'ask')
    return `你是写作助手。用户会就下方文档提问，请基于文档内容回答，不要擅自修改文档。${docBlock}`

  const toolHint = doc
    ? `\n\n【可用工具】\n- get_article_word_count(article_id): 查询指定文章的字数。当前绑定文档 ID 为 ${doc.articleId}，用户询问字数、篇幅、有多少字等问题时请调用此工具。`
    : '\n\n【可用工具】\n- get_article_word_count(article_id): 查询指定文章的字数。'

  return `你是写作 Agent。用户会要求你修改或讨论下方文档。你可以调用工具获取信息。${docBlock}${toolHint}`
}

/** 工具注册表：API name → UI 展示（executeTool 复用 tools.ts 中的定义） */
export { AGENT_TOOL_REGISTRY } from './tools'
