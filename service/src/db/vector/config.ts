import * as dotenv from 'dotenv'

dotenv.config()

/** 与 article_chunks.embedding vector(N) 一致；更换模型维度须重建表 */
export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536)

export function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
}

export function getEmbeddingApiKey(): string | undefined {
  return process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || undefined
}

export function getEmbeddingBaseURL(): string | undefined {
  return process.env.EMBEDDING_API_BASE_URL
    || process.env.OPENAI_API_BASE_URL
    || undefined
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(getEmbeddingApiKey())
}
