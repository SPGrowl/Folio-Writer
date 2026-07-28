import { prisma } from './prisma'
import { addArticleToGroup, removeArticleFromGroup } from './articleGroups'

/** 与前端 Compose.Article 对齐的返回结构（驼峰命名） */
export interface ArticleDto {
  id: number
  title: string
  content: string
  linkedGroup: string
  createdAt: string
  updatedAt: string
  history: Array<{
    insertTime: string
    content: string
  }>
}

/** 新增文章时的入参 */
export interface CreateArticleInput {
  /** 可选：指定主键；不传则由数据库 BIGSERIAL 自增 */
  id?: number
  title?: string
  /** 必填：文章正文 */
  content: string
  /** 必填：所属文章组的 UUID */
  linkedGroupId: string
}

/** 更新文章时的入参 */
export interface UpdateArticleInput {
  id: number
  title?: string
  content: string
}

/** Prisma 查询 article + history 的返回形状 */
interface ArticleWithHistory {
  id: bigint
  title: string
  content: string
  linkedGroup: string
  createdAt: Date
  updatedAt: Date
  history: Array<{
    insertTime: Date
    content: string
  }>
}

const historyOrder = { insertTime: 'desc' as const }

/** 把 Prisma 模型转成前端需要的 Article 对象（BigInt → number） */
function toArticleDto(article: ArticleWithHistory): ArticleDto {
  return {
    id: Number(article.id),
    title: article.title,
    content: article.content,
    linkedGroup: article.linkedGroup,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    history: article.history.map(h => ({
      insertTime: h.insertTime.toISOString(),
      content: h.content,
    })),
  }
}

/**
 * 查：拉取全部未删除文章，并附带各自的历史版本列表。
 * 历史按 insert_time 倒序（最新的在前）。
 *
 * Prisma 等价于：
 *   findMany({ where: { deletedAt: null }, include: { history } })
 * 替代原先两次 SQL + Map 分组的手动组装。
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
 * 增：插入一篇新文章，并把初始正文写入历史表（首条快照）。
 * 须传入 content 与 linkedGroupId，并将文章加入对应分组。
 */
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
        history: {
          create: { content },
        },
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

/**
 * 改：按 id 更新文章正文（及可选标题）。
 * 更新完成后，把「本次更新后的全量正文」写入 article_history。
 *
 * Prisma 等价于：
 *   $transaction → findFirst → update → history.create → findMany
 * 事务内保证「读-改-写历史」原子性，替代 FOR UPDATE + 多条 SQL。
 */
export async function updateArticle(input: UpdateArticleInput): Promise<ArticleDto | null> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.article.findFirst({
      where: { id: BigInt(input.id), deletedAt: null },
    })

    if (!current)
      return null

    const title = input.title?.trim() || current.title
    const content = input.content

    const updated = await tx.article.update({
      where: { id: BigInt(input.id) },
      data: { title, content },
    })

    await tx.articleHistory.create({
      data: {
        articleId: BigInt(input.id),
        content,
      },
    })

    const history = await tx.articleHistory.findMany({
      where: { articleId: BigInt(input.id) },
      orderBy: historyOrder,
    })

    return toArticleDto({ ...updated, history })
  })
}

/**
 * 删：按 id 硬删除文章。
 * 先从 article_groups 中移除该文章（组内无文章时删除分组），
 * article_history 外键 CASCADE 自动清空历史。
 */
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
