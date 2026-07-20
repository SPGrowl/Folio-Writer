import type { PoolClient } from 'pg'
import { pool } from './pool'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessageRow {
  id: number
  session_id: number
  seq: number
  role: MessageRole
  content: string | null
  reasoning_content: string | null
  error: boolean
  created_at: Date
}

export interface CreateMessageInput {
  sessionUuid: number
  role: MessageRole
  content?: string | null
  reasoningContent?: string | null
  error?: boolean
  /** 会话不存在时用于创建会话的标题 */
  sessionTitle?: string
}

// 检查会话是否存在
async function ensureSession(
  client: PoolClient,
  sessionUuid: number,
  sessionTitle?: string,
) {
  const existing = await client.query<{ id: number }>(
    'SELECT id FROM chat_sessions WHERE uuid = $1 AND deleted_at IS NULL',
    [sessionUuid],
  )

  if (existing.rows[0])
    return existing.rows[0].id

  const inserted = await client.query<{ id: number }>(
    `INSERT INTO chat_sessions (uuid, title)
     VALUES ($1, $2)
     RETURNING id`,
    [sessionUuid, sessionTitle?.trim() || '新对话'],
  )

  return inserted.rows[0].id
}

async function nextSeq(client: PoolClient, sessionId: number) {
  const result = await client.query<{ next_seq: number }>(
    `SELECT COALESCE(MAX(seq), -1) + 1 AS next_seq
     FROM chat_messages
     WHERE session_id = $1`,
    [sessionId],
  )
  return result.rows[0].next_seq
}

/** 新增单条消息；若会话不存在则自动创建 */
export async function createMessage(input: CreateMessageInput): Promise<ChatMessageRow> {
  const client = await pool.connect()

  try {
    // 开启事务
    await client.query('BEGIN')

    const sessionId = await ensureSession(client, input.sessionUuid, input.sessionTitle)
    const seq = await nextSeq(client, sessionId)

    const inserted = await client.query<ChatMessageRow>(
      `INSERT INTO chat_messages (
         session_id, seq, role, content, reasoning_content, error
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, session_id, seq, role, content, reasoning_content, error, created_at`,
      [
        sessionId,
        seq,
        input.role,
        input.content ?? null,
        input.reasoningContent ?? null,
        input.error ?? false,
      ],
    )

    await client.query(
      'UPDATE chat_sessions SET updated_at = now() WHERE id = $1',
      [sessionId],
    )

    await client.query('COMMIT')
    return inserted.rows[0]
  }
  catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
}
