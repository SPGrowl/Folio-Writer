import type { PoolClient } from 'pg'
import { pool } from './pool'

/** 数据库 articles 表一行（列名与 PostgreSQL 一致，蛇形命名） */
export interface ArticleRow {
  id: number
  title: string
  content: string
  created_at: Date
  updated_at: Date
}

/** 数据库 article_history 表一行 */
export interface ArticleHistoryRow {
  id: number
  article_id: number
  content: string
  insert_time: Date
}

/** 与前端 Compose.Article 对齐的返回结构（驼峰命名） */
export interface ArticleDto {
  id: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
  history: Array<{
    insertTime: string
    content: string
  }>
}

/** 新增文章时的入参 */
export interface CreateArticleInput {
  /** 可选：指定主键；不传则由数据库 BIGSERIAL 自增 */
  id?: number
  title?: string
  content: string
}

/** 更新文章时的入参 */
export interface UpdateArticleInput {
  id: number
  title?: string
  content: string
}

/** 把数据库时间转成 ISO 字符串，供 JSON 返回给前端 */
function toIsoString(value: Date): string {
  return value.toISOString()
}

/** 把 articles 行 + 历史记录拼成前端需要的 Article 对象 */
function toArticleDto(row: ArticleRow, historyRows: ArticleHistoryRow[]): ArticleDto {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    history: historyRows.map(h => ({
      insertTime: toIsoString(h.insert_time),
      content: h.content,
    })),
  }
}

/**
 * 查：拉取全部未删除文章，并附带各自的历史版本列表。
 * 历史按 insert_time 倒序（最新的在前）。
 */
export async function listArticles(): Promise<ArticleDto[]> {
  // 只查 deleted_at 为 NULL 的，表示未被软删除
  const articlesResult = await pool.query<ArticleRow>(
    `SELECT id, title, content, created_at, updated_at
     FROM articles
     WHERE deleted_at IS NULL
     ORDER BY updated_at DESC`,
  )

  if (articlesResult.rows.length === 0)
    return []

  const articleIds = articlesResult.rows.map(row => row.id)

  // 用 ANY($1) 一次查出这些文章的全部历史；$1 是 PostgreSQL 的数组占位符
  const historyResult = await pool.query<ArticleHistoryRow>(
    `SELECT id, article_id, content, insert_time
     FROM article_history
     WHERE article_id = ANY($1::bigint[])
     ORDER BY article_id, insert_time DESC`,
    [articleIds],
  )

  // 按 article_id 分组，方便后面组装
  const historyByArticleId = new Map<number, ArticleHistoryRow[]>()
  for (const row of historyResult.rows) {
    const list = historyByArticleId.get(row.article_id) ?? []
    list.push(row)
    historyByArticleId.set(row.article_id, list)
  }

  return articlesResult.rows.map(row =>
    toArticleDto(row, historyByArticleId.get(row.id) ?? []),
  )
}

/**
 * 增：插入一篇新文章，并把初始正文写入历史表（首条快照）。
 * - content 必填
 * - title 可选，默认「未命名文章」
 * - id 可选；若传入则使用该主键（需不与已有记录冲突）
 */
export async function createArticle(input: CreateArticleInput): Promise<ArticleDto> {
  const client: PoolClient = await pool.connect()
  const title = input.title?.trim() || '未命名文章'
  const content = input.content ?? ''

  try {
    await client.query('BEGIN')

    let inserted: ArticleRow

    if (input.id != null) {
      const result = await client.query<ArticleRow>(
        `INSERT INTO articles (id, title, content)
         VALUES ($1, $2, $3)
         RETURNING id, title, content, created_at, updated_at`,
        [input.id, title, content],
      )
      inserted = result.rows[0]
    }
    else {
      const result = await client.query<ArticleRow>(
        `INSERT INTO articles (title, content)
         VALUES ($1, $2)
         RETURNING id, title, content, created_at, updated_at`,
        [title, content],
      )
      inserted = result.rows[0]
    }

    // 新增时把初始全量正文推入历史
    const history = await client.query<ArticleHistoryRow>(
      `INSERT INTO article_history (article_id, content)
       VALUES ($1, $2)
       RETURNING id, article_id, content, insert_time`,
      [inserted.id, content],
    )

    await client.query('COMMIT')
    return toArticleDto(inserted, history.rows)
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
}

/**
 * 改：按 id 更新文章正文（及可选标题）。
 * 更新完成后，把「本次更新后的全量正文」写入 article_history。
 */
export async function updateArticle(input: UpdateArticleInput): Promise<ArticleDto | null> {
  const client: PoolClient = await pool.connect()

  try {
    await client.query('BEGIN')

    const current = await client.query<ArticleRow>(
      `SELECT id, title, content, created_at, updated_at
       FROM articles
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [input.id],
    )

    const row = current.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return null
    }

    const title = input.title?.trim() || row.title
    const content = input.content

    const updated = await client.query<ArticleRow>(
      `UPDATE articles
       SET title = $2,
           content = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING id, title, content, created_at, updated_at`,
      [input.id, title, content],
    )

    // 把更新后的全量正文推入历史表
    await client.query(
      `INSERT INTO article_history (article_id, content)
       VALUES ($1, $2)`,
      [input.id, content],
    )

    const history = await client.query<ArticleHistoryRow>(
      `SELECT id, article_id, content, insert_time
       FROM article_history
       WHERE article_id = $1
       ORDER BY insert_time DESC`,
      [input.id],
    )

    await client.query('COMMIT')
    return toArticleDto(updated.rows[0], history.rows)
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
}

/**
 * 删：按 id 硬删除文章。
 * article_history 外键配置了 ON DELETE CASCADE，删文章时会自动清空该文的历史。
 */
export async function deleteArticle(id: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM articles
     WHERE id = $1 AND deleted_at IS NULL`,
    [id],
  )

  // rowCount 表示实际删了几行；0 表示 id 不存在或已删
  return (result.rowCount ?? 0) > 0
}
