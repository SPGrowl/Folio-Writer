import type { Router } from 'express'
import { auth } from '../middleware/auth'
import { limiter } from '../middleware/limiter'
import { streamChatCompletion } from '../oepnai/stream'
import type { AgentProcessBody } from '../types'

/**
 * Agent 侧栏专用流式对话路由，与 /chat-process 分离。
 * 现阶段透传 OpenAI 标准请求体；后续可在此按 mode / documentContext 做服务端 prompt 编排。
 */
export function registerAgentRoutes(router: Router) {
  router.post('/agent-process', [auth, limiter], async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    try {
      const {
        model,
        messages,
        temperature,
        top_p,
        extra_body,
        reasoning_effort,
        tools,
        mode: _mode,
        documentContext: _documentContext,
      } = req.body as AgentProcessBody

      await streamChatCompletion(
        {
          model,
          messages,
          temperature,
          top_p,
          stream: true,
          ...(tools?.length ? { tools } : {}),
          ...(extra_body ?? {}),
          ...(reasoning_effort ? { reasoning_effort } : {}),
        },
        res,
      )
    }
    catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: { message: error.message } })}\n\n`)
    }
    finally {
      res.end()
    }
  })
}
