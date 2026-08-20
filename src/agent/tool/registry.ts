import { executeGetArticleContent } from './getArticleContent'
import { executeGetArticleWordCount } from './getArticleWordCount'
import { executeGetGroupArticles } from './getGroupArticles'
import { executeListGroupArticles } from './listGroupArticles'
import { executeCreateArticleInGroup } from './createArticleInGroup'
import { executeUpdateArticleContent } from './updateArticleContent'
import { executePatchArticleContent } from './patchArticleContent'

/** 工具名 → 执行（与 AGENT_TOOL_DEFINITIONS 保持同步） */
export const AGENT_TOOL_REGISTRY: Record<string, AgentStep.ToolRegistryEntry> = {
  create_article: { execute: executeCreateArticleInGroup },
  update_article_content: { execute: executeUpdateArticleContent },
  patch_article_content: { execute: executePatchArticleContent },
  list_group_articles: { execute: executeListGroupArticles },
  get_article_content: { execute: executeGetArticleContent },
  get_article_word_count: { execute: executeGetArticleWordCount },
  get_group_articles: { execute: executeGetGroupArticles },
}
