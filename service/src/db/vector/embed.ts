import OpenAI from 'openai'
import {
  EMBEDDING_DIMENSIONS,
  getEmbeddingApiKey,
  getEmbeddingBaseURL,
  getEmbeddingModel,
  isEmbeddingConfigured,
} from './config'

let client: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = getEmbeddingApiKey()
  if (!apiKey)
    throw new Error('未配置 EMBEDDING_API_KEY / OPENAI_API_KEY，无法生成向量')

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: getEmbeddingBaseURL(),
    })
  }
  return client
}

/** 批量生成 embedding；空串跳过 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length)
    return []

  if (!isEmbeddingConfigured())
    throw new Error('Embedding 未配置')

  const openai = getClient()
  const model = getEmbeddingModel()
  const request: OpenAI.EmbeddingCreateParams = {
    model,
    input: texts,
  }
  // 仅当显式配置维度时传入（ada-002 等旧模型不支持该参数）
  if (process.env.EMBEDDING_DIMENSIONS)
    request.dimensions = EMBEDDING_DIMENSIONS

  const response = await openai.embeddings.create(request)

  const sorted = [...response.data].sort((a, b) => a.index - b.index)
  return sorted.map((item) => {
    if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `embedding 维度为 ${item.embedding.length}，与配置 EMBEDDING_DIMENSIONS=${EMBEDDING_DIMENSIONS} 不一致`,
      )
    }
    return item.embedding
  })
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  return vec
}
