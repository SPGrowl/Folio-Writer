import type { Router } from 'express'
import { createMessage, type MessageRole } from '../db/messages'

const VALID_ROLES: MessageRole[] = ['user', 'assistant', 'system']

function isMessageRole(value: unknown): value is MessageRole {
  return typeof value === 'string' && VALID_ROLES.includes(value as MessageRole)
}

export function registerMessageRoutes(router: Router) {
  /** 新增单条消息（演示 Node 写入 PostgreSQL） */
  router.post('/messages', async (req, res) => {
    try {
      const { session_uuid, role, content, reasoning_content, error, session_title } = req.body ?? {}

      // 字段合法检测
      if (session_uuid == null || Number.isNaN(Number(session_uuid)))
        throw new Error('session_uuid is required and must be a number')

      if (!isMessageRole(role))
        throw new Error('role must be one of: user, assistant, system')

      const message = await createMessage({
        sessionUuid: Number(session_uuid),
        role,
        content: typeof content === 'string' ? content : content ?? null,
        reasoningContent: typeof reasoning_content === 'string' ? reasoning_content : reasoning_content ?? null,
        error: Boolean(error),
        sessionTitle: typeof session_title === 'string' ? session_title : undefined,
      })

      res.send({
        status: 'Success',
        message: '',
        data: message,
      })
    }
    catch (error: any) {
      res.status(400).send({
        status: 'Fail',
        message: error.message,
        data: null,
      })
    }
  })
}
