import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/** 与前端对齐的文章组返回结构 */
export interface ArticleGroupDto {
  id: string
  name: string
  articleIds: number[]
  createdAt: string
  updatedAt: string
}

/** 新建文章组时的入参 */
export interface CreateArticleGroupInput {
  name: string
}

type TransactionClient = Prisma.TransactionClient

function toArticleGroupDto(group: {
  id: string
  name: string
  articleIds: bigint[]
  createdAt: Date
  updatedAt: Date
}): ArticleGroupDto {
  return {
    id: group.id,
    name: group.name,
    articleIds: group.articleIds.map(id => Number(id)),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

/** 查：拉取全部文章组 */
export async function listArticleGroups(): Promise<ArticleGroupDto[]> {
  const groups = await prisma.articleGroup.findMany({
    orderBy: { updatedAt: 'desc' },
  })

  return groups.map(toArticleGroupDto)
}

/** 增：新建文章组，后端生成唯一 UUID */
export async function createArticleGroup(input: CreateArticleGroupInput): Promise<ArticleGroupDto> {
  const name = input.name?.trim() || '未命名分组'

  const group = await prisma.articleGroup.create({
    data: {
      id: randomUUID(),
      name,
      articleIds: [],
    },
  })

  return toArticleGroupDto(group)
}

/** 将文章 ID 追加到指定分组 */
export async function addArticleToGroup(
  tx: TransactionClient,
  groupId: string,
  articleId: bigint,
): Promise<void> {
  const group = await tx.articleGroup.findUnique({
    where: { id: groupId },
  })

  if (!group)
    throw new Error('文章组不存在')

  if (group.articleIds.includes(articleId))
    return

  await tx.articleGroup.update({
    where: { id: groupId },
    data: { articleIds: [...group.articleIds, articleId] },
  })
}

/**
 * 从分组中移除一篇文章；若组内已无文章则删除该组。
 */
export async function removeArticleFromGroup(
  tx: TransactionClient,
  groupId: string,
  articleId: bigint,
): Promise<void> {
  if (!groupId)
    return

  const group = await tx.articleGroup.findUnique({
    where: { id: groupId },
  })

  if (!group)
    return

  const nextIds = group.articleIds.filter(id => id !== articleId)

  if (nextIds.length === 0) {
    await tx.articleGroup.delete({ where: { id: groupId } })
    return
  }

  await tx.articleGroup.update({
    where: { id: groupId },
    data: { articleIds: nextIds },
  })
}
