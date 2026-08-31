import { pool } from '../pool'
import { chunkMarkdown } from './chunkText'
import { embedTexts } from './embed'
import { ensureVectorStore, isVectorStoreReady } from './ensure'
import { isEmbeddingConfigured } from './config'

export interface ReindexArticleInput {
  articleId: number
  title: string
  content: string
  groupId: string
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

/** 删除某篇文章的全部切片 */
export async function deleteArticleChunks(articleId: number): Promise<void> {
  if (!isVectorStoreReady())
    await ensureVectorStore()

  await pool.query('DELETE FROM article_chunks WHERE article_id = $1', [articleId])
}

/**
 * 按当前 draft 重建一篇文章的向量切片。
 * 空正文 → 仅清空旧切片。
 */
export async function reindexArticle(input: ReindexArticleInput): Promise<{ chunkCount: number }> {
  if (!isEmbeddingConfigured()) {
    globalThis.console.warn('[vector] Embedding 未配置，跳过文章索引', input.articleId)
    return { chunkCount: 0 }
  }

  if (!isVectorStoreReady())
    await ensureVectorStore()

  const chunks = chunkMarkdown(input.content ?? '')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM article_chunks WHERE article_id = $1', [input.articleId])

    if (!chunks.length) {
      await client.query('COMMIT')
      return { chunkCount: 0 }
    }

    const vectors = await embedTexts(chunks.map(c => c.content))

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = vectors[i]
      await client.query(
        `INSERT INTO article_chunks
          (article_id, group_id, title, chunk_index, content, start_offset, end_offset, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
        [
          input.articleId,
          input.groupId || '',
          input.title || '',
          chunk.chunkIndex,
          chunk.content,
          chunk.startOffset,
          chunk.endOffset,
          toVectorLiteral(embedding),
        ],
      )
    }

    await client.query('COMMIT')
    return { chunkCount: chunks.length }
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
}

/** 文章 CRUD 后异步重建索引，失败只打日志，不阻断主流程 */
export function scheduleReindexArticle(input: ReindexArticleInput): void {
  void reindexArticle(input).then(
    ({ chunkCount }) => {
      globalThis.console.log(
        `[vector] 已索引文章 ${input.articleId}（${chunkCount} 切片）`,
      )
    },
    (error: any) => {
      globalThis.console.warn(
        `[vector] 索引文章 ${input.articleId} 失败: ${error?.message ?? error}`,
      )
    },
  )
}
