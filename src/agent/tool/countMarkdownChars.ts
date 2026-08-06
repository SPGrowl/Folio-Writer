/** 统计 Markdown 正文字符数（去除空白字符） */
export function countMarkdownChars(text: string): number {
  return text.replace(/\s/g, '').length
}
