/** OpenAI tools schema，agent 模式请求时携带 */
export const AGENT_TOOL_DEFINITIONS: AgentApi.ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_article',
      description: '在指定分组下按标题新建一篇文章。返回 articleId 等信息。初始正文为占位 Markdown。首次写入完整正文可用 update_article_content；之后局部修改请用 patch_article_content。内容进入 articleChanges 待审，不直接改 draft。',
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
      description: '不推荐。仅用于整篇重写、结构大改，或新建后首次灌入完整 Markdown。日常局部修改请用 patch_article_content。写入 articleChanges（单槽），不直接改 draft。调用前必须先 get_article_content。',
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
      name: 'patch_article_content',
      description: [
        '推荐的写稿工具。对某篇文章做局部修改，不要在参数里返回全文。',
        'edits 为 {oldText, newText}[]：本地按顺序对当前正文做精确字符串替换，拼成完整 proposed 后写入待审槽，不直接改 draft。',
        '每次调用前必须先 get_article_content。若返回含 proposed，oldText 必须从 proposed 原样复制；否则从 draft 复制。禁止凭记忆编写 oldText。',
        'oldText 至少一整句，优先一整段，且必须在当前正文中恰好出现一次。',
        '替换：oldText=原句/段，newText=新句/段。',
        '删除：oldText=要删的句/段（可带前后一句作锚点），newText 为空字符串。',
        '插入：oldText=锚点那一句/段，newText=「锚点+新内容」或「新内容+锚点」。禁止 oldText 为空。',
        '成功后该 tool step 的 reviewStatus 为 pending，draft 不变；勿因 draft 未变而重提。用户采纳/拒绝后变为 accepted/rejected。',
        '仅在整篇重写或新建后第一次灌入全文时，才使用 update_article_content。',
      ].join(''),
      parameters: {
        type: 'object',
        properties: {
          article_id: {
            type: 'number',
            description: '文章 ID，通常为当前绑定文档的 articleId',
          },
          edits: {
            type: 'array',
            description: '按顺序应用的替换列表。每条 oldText 必须从刚读取的正文原样复制。单次最多 8 条。',
            items: {
              type: 'object',
              properties: {
                oldText: {
                  type: 'string',
                  description: '要被替换的原文片段（整句或整段，须唯一）。插入或删除时作为锚点，不能为空。',
                },
                newText: {
                  type: 'string',
                  description: '替换结果。空字符串表示删除 oldText。',
                },
              },
              required: ['oldText', 'newText'],
            },
          },
          summary: {
            type: 'string',
            description: '本次修改的 1～2 句概述，写入 tool 回执供后续对话引用',
          },
        },
        required: ['article_id', 'edits'],
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
      description: '根据文章 ID 返回 Markdown 标题与正文。返回 draft（当前编辑器正文）；若存在待审改动，同时返回 proposed（已推送的修改稿）及说明。每次改稿前必须先调用本工具。有 proposed 时，后续 patch_article_content 的 oldText 必须从 proposed 复制。',
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
