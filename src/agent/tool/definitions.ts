/** OpenAI tools schema，agent 模式请求时携带 */
export const AGENT_TOOL_DEFINITIONS: AgentApi.ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_article',
      description: '在指定分组下按标题新建一篇文章。返回 articleId 等信息。初始正文为占位 Markdown；若需写入完整内容，请再调用 update_article_content（进入 articleChanges 待审，不直接改 draft）。',
      parameters: {
        type: 'object',
        properties: {
          group_id: {
            type: 'string',
            description: '分组 ID，通常使用当前绑定文档所属的 groupId',
          },
          title: {
            type: 'string',
            description: '新文章标题',
          },
        },
        required: ['group_id', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_article_content',
      description: '提交某篇文章的全文修改建议。写入 articleChanges（单槽），不直接改 draft；用户在编辑器 diff 区采纳后才生效。成功后勿重复调用；可 get_article_content 查看 proposed。改稿前先 get_article_content 阅读 draft。',
      parameters: {
        type: 'object',
        properties: {
          article_id: {
            type: 'number',
            description: '文章 ID，通常使用当前绑定文档的 articleId',
          },
          content: {
            type: 'string',
            description: '修改后的完整 Markdown 正文',
          },
          summary: {
            type: 'string',
            description: '本次修改的简短概述（1～2 句），将写入 tool 回执供后续对话引用',
          },
        },
        required: ['article_id', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_group_articles',
      description: '根据分组 ID 返回组内文章目录（ID、标题、字数、是否有待审改动），不含正文。用户询问组内有哪些文章、先看目录再读某篇时使用；读单篇正文请用 get_article_content。',
      parameters: {
        type: 'object',
        properties: {
          group_id: {
            type: 'string',
            description: '分组 ID，通常使用当前绑定文档所属的 groupId',
          },
        },
        required: ['group_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_article_content',
      description: '根据文章 ID 返回 Markdown 标题与正文。返回 draft（当前编辑器正文）；若存在待审改动，同时返回 pending（已推送的修改稿）及说明。改稿前必读；update_article_content 成功后可用本工具核对 pending。',
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
  {
    type: 'function',
    function: {
      name: 'get_group_articles',
      description: '根据分组 ID 返回该分组下全部文章的 ID、标题与正文。用户需要整组全文、跨文章对比或汇总时使用；若只需目录或单篇，优先用 list_group_articles / get_article_content。',
      parameters: {
        type: 'object',
        properties: {
          group_id: {
            type: 'string',
            description: '分组 ID，通常使用当前绑定文档所属的 groupId',
          },
        },
        required: ['group_id'],
      },
    },
  },
]
