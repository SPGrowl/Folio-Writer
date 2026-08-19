import {
  executeGetArticleContent,
  formatDoneGetArticleContent,
  formatErrorGetArticleContent,
  formatRunningGetArticleContent,
} from './getArticleContent'
import {
  executeGetArticleWordCount,
  formatDoneGetArticleWordCount,
  formatErrorGetArticleWordCount,
  formatRunningGetArticleWordCount,
} from './getArticleWordCount'
import {
  executeGetGroupArticles,
  formatDoneGetGroupArticles,
  formatErrorGetGroupArticles,
  formatRunningGetGroupArticles,
} from './getGroupArticles'
import {
  executeListGroupArticles,
  formatDoneListGroupArticles,
  formatErrorListGroupArticles,
  formatRunningListGroupArticles,
} from './listGroupArticles'

import {
  executeCreateArticleInGroup,
  formatDoneCreateArticleInGroup,
  formatErrorCreateArticleInGroup,
  formatRunningCreateArticleInGroup,
} from './createArticleInGroup'
import {
  executeUpdateArticleContent,
  formatDoneUpdateArticleContent,
  formatErrorUpdateArticleContent,
  formatRunningUpdateArticleContent,
} from './updateArticleContent'

/** 工具名 → 执行与展示文案（与 AGENT_TOOL_DEFINITIONS 保持同步） */
export const AGENT_TOOL_REGISTRY: Record<string, AgentStep.ToolRegistryEntry> = {
  create_article: {
    formatRunning: formatRunningCreateArticleInGroup,
    formatDone: formatDoneCreateArticleInGroup,
    formatError: formatErrorCreateArticleInGroup,
    execute: executeCreateArticleInGroup,
  },
  update_article_content: {
    formatRunning: formatRunningUpdateArticleContent,
    formatDone: formatDoneUpdateArticleContent,
    formatError: formatErrorUpdateArticleContent,
    execute: executeUpdateArticleContent,
  },
  list_group_articles: {
    formatRunning: formatRunningListGroupArticles,
    formatDone: formatDoneListGroupArticles,
    formatError: formatErrorListGroupArticles,
    execute: executeListGroupArticles,
  },
  get_article_content: {
    formatRunning: formatRunningGetArticleContent,
    formatDone: formatDoneGetArticleContent,
    formatError: formatErrorGetArticleContent,
    execute: executeGetArticleContent,
  },
  get_article_word_count: {
    formatRunning: formatRunningGetArticleWordCount,
    formatDone: formatDoneGetArticleWordCount,
    formatError: formatErrorGetArticleWordCount,
    execute: executeGetArticleWordCount,
  },
  get_group_articles: {
    formatRunning: formatRunningGetGroupArticles,
    formatDone: formatDoneGetGroupArticles,
    formatError: formatErrorGetGroupArticles,
    execute: executeGetGroupArticles,
  },
}
