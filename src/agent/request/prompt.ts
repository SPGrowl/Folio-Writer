/** 组装发往 LLM 的 system prompt */

import { readArticleSnapshot } from '@/agent/tool/articleSource'

const REVIEW_WORKFLOW = `

【写稿与审阅】
- 每次修改正文前，必须先 get_article_content；禁止凭记忆写 oldText 或全文。
- 局部修改一律用 patch_article_content(edits: {oldText, newText}[])，不要在工具参数里返回全文。
- 仅整篇重写、结构大改、或新建后第一次灌入全文时，才用 update_article_content。
- 有未审 proposed 时，get 会同时返回 draft 与 proposed；patch 的 oldText 必须来自 proposed。
- 写工具成功 → 该 tool step 的 reviewStatus 为 pending；draft 不变。不要因为正文「看起来没改」而重提。
- 用户采纳/拒绝后，同一条 tool 回执变为 accepted / rejected。再改一版且尚未采纳时，可再次 patch（旧 pending 会被 superseded）。
- create_article 只建空壳；第一次写正文可用 update，之后用 patch。`

const TOOL_HINT_BASE = `
- create_article(group_id, title): 在指定分组下新建文章，返回 articleId；正文占位
- patch_article_content(article_id, edits): 推荐。提交局部替换 {oldText, newText}[]，本地拼成全文写入 articleChanges
- update_article_content(article_id, content): 不推荐。仅整篇重写或首次灌入全文
- list_group_articles(group_id): 获取组内文章目录（ID、标题、字数），不含正文
- get_article_content(article_id): 读取单篇文章标题与正文；改稿前必调用
- get_article_word_count(article_id): 查询单篇文章字数
- get_group_articles(group_id): 读取整组全部文章正文（token 开销大，仅在需要全文时使用）`

const TOOL_HINT_WITH_DOC = (doc: AgentStep.InitialContext) => `
- create_article(group_id, title): 在分组内新建文章。当前分组 ID 为 ${doc.groupId}
- patch_article_content(article_id, edits): 推荐。局部替换。当前绑定文档 ID 为 ${doc.articleId}；每次改稿前先 get_article_content
- update_article_content(article_id, content): 不推荐。仅整篇重写。当前绑定文档 ID 为 ${doc.articleId}
- list_group_articles(group_id): 获取组内文章目录。当前分组 ID 为 ${doc.groupId}
- get_article_content(article_id): 读取单篇文章正文。当前绑定文档 ID 为 ${doc.articleId}。改稿前必调用
- get_article_word_count(article_id): 查询单篇字数。当前绑定文档 ID 为 ${doc.articleId}
- get_group_articles(group_id): 读取整组全文。当前分组 ID 为 ${doc.groupId}。优先用 list / get_article_content，确需整组全文时再调用`

function buildAgentDocBlock(doc: AgentStep.InitialContext | null): string {
  if (!doc) {
    return '\n\n【当前文档】\n（无活跃文章；请通过 list_group_articles / get_article_content 获取正文）'
  }

  return `\n\n【当前文档】（仅元数据，不含正文）
分组：${doc.groupName || '未分组'}（ID: ${doc.groupId}）
标题：${doc.title}
文章 ID：${doc.articleId}
阅读或修改正文前，请先调用 get_article_content(article_id)。`
}

function buildAskDocBlock(doc: AgentStep.InitialContext): string {
  try {
    const snapshot = readArticleSnapshot(doc.articleId)
    return `\n\n【当前文档】
分组：${doc.groupName || '未分组'}
标题：${snapshot.title}

${snapshot.content}`
  }
  catch {
    return `\n\n【当前文档】
分组：${doc.groupName || '未分组'}
标题：${doc.title}

（无法读取正文）`
  }
}

export function buildSystemPrompt(session: AgentStep.Session): string {
  const doc = session.documentContext

  if (session.mode === 'ask') {
    const docBlock = doc
      ? buildAskDocBlock(doc)
      : '\n\n【当前文档】\n（无活跃文章）'
    return `你是写作助手。用户会就下方文档提问，请基于文档内容回答，不要擅自修改文档。${docBlock}`
  }

  const toolHint = doc
    ? `\n\n【可用工具】${TOOL_HINT_WITH_DOC(doc)}`
    : `\n\n【可用工具】${TOOL_HINT_BASE}`

  return `你是写作 Agent。用户会要求你修改或讨论文档。正文不在上下文中预置，请通过工具读取；局部修改用 patch_article_content，整篇重写才用 update_article_content。${buildAgentDocBlock(doc)}${REVIEW_WORKFLOW}${toolHint}`
}
