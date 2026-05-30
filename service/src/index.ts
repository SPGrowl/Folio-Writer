import express from 'express'
// ========== 旧版 chatgpt 库，已废弃 ==========
// import type { RequestProps } from './types'
// import type { ChatMessage } from './chatgpt'
// import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { streamChatCompletion } from './oepnai/stream'
import { currentModel } from './oepnai/index'

const app = express()
const router = express.Router()

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

/** 新版流式对话：接收 OpenAI 标准请求体，SSE 透传分片 */
router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  // ========== 旧版 chatgpt 流式协议，已废弃 ==========
  // res.setHeader('Content-type', 'application/octet-stream')
  // const { prompt, options = {}, systemMessage, temperature, top_p, model } = req.body as RequestProps
  // let firstChunk = true
  // await chatReplyProcess({
  //   message: prompt,
  //   lastContext: options,
  //   process: (chat: ChatMessage) => {
  //     res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
  //     firstChunk = false
  //   },
  //   systemMessage,
  //   temperature,
  //   top_p,
  //   model,
  // })

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

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
