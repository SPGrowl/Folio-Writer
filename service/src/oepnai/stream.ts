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
// 往响应体不断写入最终回答的分片
  for await (const chunk of stream)

  // res实质是字节，请求段和响应段按照约定进行读写和解析，data：... \n\n为SSE的单片格式
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)

  res.write('data: [DONE]\n\n')
}

