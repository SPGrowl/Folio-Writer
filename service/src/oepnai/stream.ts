import type { Response } from 'express'
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions'
import { client } from './index'

/**
 * 调用 OpenAI SDK 流式接口，将上游 SSE chunk 原样透传给前端。
 * 前端按标准 `data: {...}\n\n` 格式解析。
 */
export async function streamChatCompletion(
  body: ChatCompletionCreateParams,
  res: Response,
) {
  const stream = await client.chat.completions.create({
    ...body,
    stream: true,
  })

  for await (const chunk of stream)
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)

  res.write('data: [DONE]\n\n')
}
