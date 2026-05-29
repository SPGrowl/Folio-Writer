import type { Response } from 'express'
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions'
import { client } from './index'

export async function streamChatCompletion(
  body: ChatCompletionCreateParams,
  res: Response,
) {
    // 创建流
  const stream = await client.chat.completions.create({
    ...body,
    stream: true,
  })

  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }

  res.write('data: [DONE]\n\n')
}