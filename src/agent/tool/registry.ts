import {
  executeGetArticleWordCount,
  msgGetArticleWordCount,
} from './getArticleWordCount'

/** 工具名 → 执行与展示文案（与 AGENT_TOOL_DEFINITIONS 保持同步） */
export const AGENT_TOOL_REGISTRY: Record<string, AgentStep.ToolRegistryEntry> = {
  get_article_word_count: {
    msgFromArgs: msgGetArticleWordCount,
    execute: executeGetArticleWordCount,
  },
}
