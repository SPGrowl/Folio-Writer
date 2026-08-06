/** 组装发往 LLM 的 system prompt */

export function buildSystemPrompt(session: AgentStep.Session): string {
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
