import { pool } from '../pool'
import { EMBEDDING_DIMENSIONS } from './config'

let ready = false

/**
 * 幂等：启用 pgvector、创建 article_chunks 与索引。
 * 若扩展未安装，抛错并提示使用 pgvector 镜像。
 */
export async function ensureVectorStore(): Promise<void> {
  if (ready)
    return

  const client = await pool.connect()
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector')
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    await client.query(`
      CREATE TABLE IF NOT EXISTS article_chunks (
        id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id    BIGINT       NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
        group_id      VARCHAR(256) NOT NULL DEFAULT '',
        title         VARCHAR(256) NOT NULL DEFAULT '',
        chunk_index   INT          NOT NULL,
        content       TEXT         NOT NULL,
        start_offset  INT,
        end_offset    INT,
        embedding     vector(${EMBEDDING_DIMENSIONS}) NOT NULL,
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_article_chunks_article
        ON article_chunks (article_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_article_chunks_group
        ON article_chunks (group_id)
    `)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_article_chunks_embedding_hnsw
        ON article_chunks
        USING hnsw (embedding vector_cosine_ops)
    `)

    ready = true
  }
  catch (error: any) {
    const message = String(error?.message ?? error)
    if (/extension ["']?vector["']? is not available|could not open extension control file/i.test(message)) {
      throw new Error(
        'PostgreSQL 未安装 pgvector。请使用 pgvector/pgvector 镜像或为当前实例安装 vector 扩展后重试。',
      )
    }
    throw error
  }
  finally {
    client.release()
  }
}

export function isVectorStoreReady(): boolean {
  return ready
}

export function resetVectorStoreReadyFlag(): void {
  ready = false
}
