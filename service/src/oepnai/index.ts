import OpenAI from 'openai'

export const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE_URL, // 如 https://api.deepseek.com
})
export function currentModel() {
    return process.env.OPENAI_API_MODEL ?? 'deepseek-v4-pro'
  }