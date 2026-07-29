import { prisma } from './prisma'
import { addArticleToGroup, removeArticleFromGroup } from './articleGroups'

/** 单条版本历史（类似 git commit） */
export interface ArticleHistoryDto {
  id: string
  articleId: number
  message: string
  content: string
  insertTime: string
}

/** 文章摘要（不含 history 列表，用于版本提交响应） */
export interface ArticleSummaryDto {
  id: number
  title: string
  content: string
  linkedGroup: string
  createdAt: string
  updatedAt: string
}

/** 与前端 Compose.Article 对齐的返回结构（驼峰命名） */
export interface ArticleDto extends ArticleSummaryDto {
  history: ArticleHistoryDto[]
}

/** 提交版本后的完整响应 */
export interface CreateArticleHistoryResult {
  version: ArticleHistoryDto
  article: ArticleSummaryDto
}

/** 删除版本后的响应 */
export interface DeleteArticleHistoryResult {
  articleId: number
  versionId: string
}

/** 新增文章时的入参 */
export interface CreateArticleInput {
  id?: number
  title?: string
  content: string
  linkedGroupId: string
}

/** 更新文章时的入参 */
export interface UpdateArticleInput {
  id: number
  title?: string
  content: string
}

/** 提交版本历史时的入参（类似 git commit -m） */
export interface CreateArticleHistoryInput {
  articleId: number
  content: string
  message: string
}

type HistoryRow = {
  id: string
  articleId: bigint
  content: string
  insertTime: Date
  message?: string
}

type ArticleWithHistory = {
  id: bigint
  title: string
  content: string
  linkedGroup: string
  createdAt: Date
  updatedAt: Date
  history: HistoryRow[]
}

const historyOrder = { insertTime: 'desc' as const }

function toHistoryDto(row: HistoryRow): ArticleHistoryDto {
  return {
    id: row.id,
    articleId: Number(row.articleId),
    message: row.message ?? '',
    content: row.content,
    insertTime: row.insertTime.toISOString(),
  }
}

function toArticleSummary(article: {
  id: bigint
  title: string
  content: string
  linkedGroup: string
  createdAt: Date
  updatedAt: Date
}): ArticleSummaryDto {
  return {
    id: Number(article.id),
    title: article.title,
    content: article.content,
    linkedGroup: article.linkedGroup,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }
}

function toArticleDto(article: ArticleWithHistory): ArticleDto {
  return {
    ...toArticleSummary(article),
    history: article.history.map(toHistoryDto),
  }
}

/**
 * 查：拉取全部未删除文章，并附带各自的历史版本列表。
 */
export async function listArticles(): Promise<ArticleDto[]> {
  const articles = await prisma.article.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: {
      history: { orderBy: historyOrder },
    },
  })

  return articles.map(toArticleDto)
}

/**
 * 查：根据文章 ID 拉取该文章的全部版本历史。
 */
export async function listArticleHistory(
  articleId: number,
): Promise<ArticleHistoryDto[] | null> {
  const article = await prisma.article.findFirst({
    where: { id: BigInt(articleId), deletedAt: null },
    select: { id: true },
  })

  if (!article)
    return null

  const rows = await prisma.articleHistory.findMany({
    where: { articleId: BigInt(articleId) },
    orderBy: historyOrder,
  })

  return rows.map(toHistoryDto)
}

export async function createArticle(input: CreateArticleInput): Promise<ArticleDto> {
  const title = input.title?.trim() || '未命名文章'
  const content = input.content ?? ''
  const linkedGroupId = input.linkedGroupId?.trim()

  if (!linkedGroupId)
    throw new Error('linkedGroupId 必填')

  const article = await prisma.$transaction(async (tx) => {
    const group = await tx.articleGroup.findUnique({
      where: { id: linkedGroupId },
    })

    if (!group)
      throw new Error('文章组不存在')

    const created = await tx.article.create({
      data: {
        ...(input.id != null ? { id: BigInt(input.id) } : {}),
        title,
        content,
        linkedGroup: linkedGroupId,
      },
      include: {
        history: { orderBy: historyOrder },
      },
    })

    await addArticleToGroup(tx, linkedGroupId, created.id)

    return created
  })

  return toArticleDto(article)
}

export async function updateArticle(input: UpdateArticleInput): Promise<ArticleDto | null> {
  const current = await prisma.article.findFirst({
    where: { id: BigInt(input.id), deletedAt: null },
  })

  if (!current)
    return null

  const title = input.title?.trim() || current.title
  const content = input.content

  const updated = await prisma.article.update({
    where: { id: BigInt(input.id) },
    data: { title, content },
    include: {
      history: { orderBy: historyOrder },
    },
  })

  return toArticleDto(updated)
}

/**
 * 增：提交一条版本历史（类似 git commit -m）。
 * 返回新版本的完整信息及所属文章摘要。
 */
export async function createArticleHistory(
  input: CreateArticleHistoryInput,
): Promise<CreateArticleHistoryResult | null> {
  const article = await prisma.article.findFirst({
    where: { id: BigInt(input.articleId), deletedAt: null },
  })

  if (!article)
    return null

  const version = await prisma.articleHistory.create({
    data: {
      articleId: BigInt(input.articleId),
      content: input.content,
      message: input.message,
    },
  })

  return {
    version: toHistoryDto(version),
    article: toArticleSummary(article),
  }
}

/**
 * 删：根据文章 ID + 版本 ID 删除单条历史。
 * 不影响文章当前工作区正文。
 */
export async function deleteArticleHistory(
  articleId: number,
  versionId: string,
): Promise<DeleteArticleHistoryResult | null> {
  const deleted = await prisma.articleHistory.deleteMany({
    where: {
      id: versionId,
      articleId: BigInt(articleId),
    },
  })

  if (deleted.count === 0)
    return null

  return { articleId, versionId }
}

export async function deleteArticle(id: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.article.findFirst({
      where: { id: BigInt(id), deletedAt: null },
    })

    if (!current)
      return false

    await removeArticleFromGroup(tx, current.linkedGroup, BigInt(id))

    const result = await tx.article.deleteMany({
      where: { id: BigInt(id), deletedAt: null },
    })

    return result.count > 0
  })
}
