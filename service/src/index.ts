import express from 'express'
// ========== 旧版 chatgpt 库，已废弃 ==========
// import type { RequestProps } from './types'
// import type { ChatMessage } from './chatgpt'
// import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { testConnection } from './db/pool'
import { testPrismaConnection } from './db/prisma'
import { ensureDefaultArticleGroup } from './db/articleGroups'
import { ensureVectorStore, isEmbeddingConfigured } from './db/vector'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { registerArticleRoutes } from './routes/articles'
import { registerAgentRoutes } from './routes/agent'
import { registerMessageRoutes } from './routes/messages'
import { isNotEmptyString } from './utils/is'
import { streamChatCompletion } from './oepnai/stream'
import { currentModel } from './oepnai/index'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json({ limit: '10mb' }))

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

/** 新版流式对话：接收 OpenAI 标准请求体，SSE 透传分片 */
router.post('/chat-process', [auth, limiter], async (req, res) => {
  // 设置响应头，告知前端这是SSE流式响应，按照SSE格式解析响应体
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
    } = req.body

    await streamChatCompletion(
      {
        model,
        messages,
        temperature,
        top_p,
        stream: true,
        // DeepSeek 等网关的扩展字段
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

router.post('/config', auth, async (req, res) => {
  // 旧版：const response = await chatConfig()
  res.send({
    status: 'Success',
    data: { model: currentModel() },
  })
})

router.post('/session', async (req, res) => {
  try {
    const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
    const hasAuth = isNotEmptyString(AUTH_SECRET_KEY)
    res.send({ status: 'Success', message: '', data: { auth: hasAuth, model: currentModel() } })
  }
  catch (error: any) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error: any) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

registerMessageRoutes(router)
registerArticleRoutes(router)
registerAgentRoutes(router)

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)


app.listen(3002, async () => {
  globalThis.console.log('Server is running on port 3002')
  try {
    await testConnection()
    await testPrismaConnection()
    await ensureDefaultArticleGroup()
    globalThis.console.log('PostgreSQL connected (pg + Prisma)')
  }
  catch (error: any) {
    globalThis.console.warn(`PostgreSQL unavailable: ${error.message}`)
    return
  }

  try {
    await ensureVectorStore()
    globalThis.console.log(
      isEmbeddingConfigured()
        ? 'pgvector ready (article_chunks); embedding configured'
        : 'pgvector ready (article_chunks); embedding NOT configured — indexing will be skipped',
    )
  }
  catch (error: any) {
    globalThis.console.warn(`pgvector unavailable: ${error.message}`)
  }
})
