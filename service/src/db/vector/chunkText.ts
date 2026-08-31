export interface TextChunk {
  chunkIndex: number
  content: string
  startOffset: number
  endOffset: number
}

const DEFAULT_MAX_CHARS = 800
const DEFAULT_OVERLAP = 80
const MIN_CHUNK_CHARS = 24

/**
 * 按空行 / 标题粗切，再按长度合并或滑窗，保留原文偏移。
 */
export function chunkMarkdown(
  text: string,
  options?: { maxChars?: number; overlap?: number },
): TextChunk[] {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS
  const overlap = options?.overlap ?? DEFAULT_OVERLAP
  const source = text.replace(/\r\n/g, '\n')

  if (!source.trim())
    return []

  const blocks = splitBlocks(source)
  const merged: TextChunk[] = []
  let buf = ''
  let bufStart = 0
  let chunkIndex = 0

  const flush = (endOffset: number) => {
    const content = buf.trim()
    if (content.length >= MIN_CHUNK_CHARS) {
      merged.push({
        chunkIndex: chunkIndex++,
        content,
        startOffset: bufStart,
        endOffset,
      })
    }
    buf = ''
  }

  for (const block of blocks) {
    const piece = block.text
    if (!piece.trim())
      continue

    if (!buf) {
      buf = piece
      bufStart = block.start
      if (buf.length >= maxChars) {
        for (const part of slidingWindow(buf, bufStart, maxChars, overlap)) {
          merged.push({
            chunkIndex: chunkIndex++,
            content: part.content,
            startOffset: part.startOffset,
            endOffset: part.endOffset,
          })
        }
        buf = ''
      }
      continue
    }

    if (buf.length + 1 + piece.length <= maxChars) {
      buf = `${buf}\n\n${piece}`
      continue
    }

    flush(block.start)
    buf = piece
    bufStart = block.start
    if (buf.length >= maxChars) {
      for (const part of slidingWindow(buf, bufStart, maxChars, overlap)) {
        merged.push({
          chunkIndex: chunkIndex++,
          content: part.content,
          startOffset: part.startOffset,
          endOffset: part.endOffset,
        })
      }
      buf = ''
    }
  }

  if (buf)
    flush(source.length)

  return merged
}

function splitBlocks(source: string): Array<{ text: string; start: number }> {
  const blocks: Array<{ text: string; start: number }> = []
  const parts = source.split(/\n{2,}/)
  let cursor = 0

  for (const part of parts) {
    const idx = source.indexOf(part, cursor)
    const start = idx >= 0 ? idx : cursor
    blocks.push({ text: part, start })
    cursor = start + part.length
  }

  // 再按 AT 行切开超大块
  const refined: Array<{ text: string; start: number }> = []
  for (const block of blocks) {
    if (!/^#{1,6}\s/m.test(block.text) || block.text.length < 40) {
      refined.push(block)
      continue
    }
    const lines = block.text.split('\n')
    let acc = ''
    let accStart = block.start
    let lineOffset = block.start

    for (const line of lines) {
      const isHeading = /^#{1,6}\s/.test(line)
      if (isHeading && acc.trim()) {
        refined.push({ text: acc.replace(/\n$/, ''), start: accStart })
        acc = `${line}\n`
        accStart = lineOffset
      }
      else {
        if (!acc)
          accStart = lineOffset
        acc += `${line}\n`
      }
      lineOffset += line.length + 1
    }
    if (acc.trim())
      refined.push({ text: acc.replace(/\n$/, ''), start: accStart })
  }

  return refined
}

function slidingWindow(
  text: string,
  baseOffset: number,
  maxChars: number,
  overlap: number,
): Array<{ content: string; startOffset: number; endOffset: number }> {
  const out: Array<{ content: string; startOffset: number; endOffset: number }> = []
  const step = Math.max(maxChars - overlap, 1)
  let i = 0
  while (i < text.length) {
    const slice = text.slice(i, i + maxChars).trim()
    if (slice.length >= MIN_CHUNK_CHARS) {
      out.push({
        content: slice,
        startOffset: baseOffset + i,
        endOffset: baseOffset + Math.min(i + maxChars, text.length),
      })
    }
    if (i + maxChars >= text.length)
      break
    i += step
  }
  return out
}
