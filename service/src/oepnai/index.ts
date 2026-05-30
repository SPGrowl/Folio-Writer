import OpenAI from 'openai'
import * as dotenv from 'dotenv'

dotenv.config()

/** 标准 OpenAI Node SDK 客户端，替代旧版 chatgpt 库 */
export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL,
})

export function currentModel() {
  return process.env.OPENAI_API_MODEL ?? 'deepseek-v4-pro'
}
