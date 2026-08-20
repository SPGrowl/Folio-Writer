/** 局部替换：oldText 必须在原文中恰好出现一次 */
export interface TextEdit {
  oldText: string
  newText: string
}

export const MAX_TEXT_EDITS = 8

function previewSnippet(text: string, max = 48): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= max)
    return compact
  return `${compact.slice(0, max)}…`
}

/** 从工具参数解析 edits，兼容 oldText/old_text */
export function parseTextEdits(raw: unknown): TextEdit[] {
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error('edits 必须是非空数组 { oldText, newText }[]')

  if (raw.length > MAX_TEXT_EDITS)
    throw new Error(`单次最多 ${MAX_TEXT_EDITS} 条 edits，请拆成多次调用或改用 update_article_content`)

  return raw.map((item, index) => {
    const n = index + 1
    if (!item || typeof item !== 'object')
      throw new Error(`第 ${n} 条 edits 无效`)

    const record = item as Record<string, unknown>
    const oldText = record.oldText ?? record.old_text
    const newText = record.newText ?? record.new_text

    if (typeof oldText !== 'string' || typeof newText !== 'string')
      throw new Error(`第 ${n} 条必须包含字符串 oldText 与 newText`)

    if (!oldText)
      throw new Error(`第 ${n} 条 oldText 为空：插入或删除请带一句上下文作为锚点`)

    return { oldText, newText }
  })
}

/**
 * 按顺序将 edits 应用到原文，返回完整正文。
 * 每条 oldText 必须恰好匹配一次；失败抛错，不静默跳过。
 */
export function applyTextEdits(base: string, edits: TextEdit[]): string {
  let next = base

  for (let i = 0; i < edits.length; i++) {
    const n = i + 1
    const { oldText, newText } = edits[i]
    const first = next.indexOf(oldText)

    if (first === -1) {
      throw new Error(
        `第 ${n} 条未找到 oldText「${previewSnippet(oldText)}」。请先 get_article_content，从 draft 或 proposed 原样复制整句或整段。`,
      )
    }

    const second = next.indexOf(oldText, first + oldText.length)
    if (second !== -1) {
      throw new Error(
        `第 ${n} 条 oldText「${previewSnippet(oldText)}」出现多次。请扩大到整句或整段，保证唯一。`,
      )
    }

    next = next.slice(0, first) + newText + next.slice(first + oldText.length)
  }

  return next
}

/** 解析 edits 并应用到原文，返回完整正文 */
export function buildContentFromEdits(base: string, rawEdits: unknown): string {
  return applyTextEdits(base, parseTextEdits(rawEdits))
}
