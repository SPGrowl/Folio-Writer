const ARTICLE_WRITE_TOOLS = new Set([
  'update_article_content',
  'patch_article_content',
])

/** 会写入 articleChanges 的写工具（全文 / 局部 patch） */
export function isArticleWriteTool(name: string): boolean {
  return ARTICLE_WRITE_TOOLS.has(name)
}
