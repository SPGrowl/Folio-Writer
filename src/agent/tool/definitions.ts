/** OpenAI tools schema，agent 模式请求时携带 */
export const AGENT_TOOL_DEFINITIONS: AgentApi.ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_article_word_count',
      description: '根据文章 ID 查询该篇 Markdown 正文的字数（去空白后的字符数）。用户询问字数、篇幅、有多少字时使用。',
      parameters: {
        type: 'object',
        properties: {
          article_id: {
            type: 'number',
            description: '文章 ID，通常使用当前绑定文档的 articleId',
          },
        },
        required: ['article_id'],
      },
    },
  },
]
