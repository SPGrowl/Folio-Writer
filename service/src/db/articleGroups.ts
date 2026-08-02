import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/** 系统默认分组名称 */
export const DEFAULT_GROUP_NAME = '默认分组'

/** 与前端对齐的文章组返回结构 */
export interface ArticleGroupDto {
  id: string
  name: string
  articleIds: number[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

/** 新建文章组时的入参 */
export interface CreateArticleGroupInput {
  name: string
}

/** 更新文章组时的入参 */
export interface UpdateArticleGroupInput {
  name: string
}

type TransactionClient = Prisma.TransactionClient

function toArticleGroupDto(group: {
  id: string
  name: string
  articleIds: bigint[]
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}): ArticleGroupDto {
  return {
    id: group.id,
    name: group.name,
    articleIds: group.articleIds.map(id => Number(id)),
    isDefault: group.isDefault,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  }
}

/**
 * 确保数据库中存在且仅有一个默认分组。
 * 服务启动时调用；若已有分组但无默认标记，则将最早创建的分组设为默认。
 */
export async function ensureDefaultArticleGroup(): Promise<ArticleGroupDto> {
  const existing = await prisma.articleGroup.findFirst({
    where: { isDefault: true },
  })

  if (existing)
    return toArticleGroupDto(existing)

  const oldest = await prisma.articleGroup.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (oldest) {
    const updated = await prisma.articleGroup.update({
      where: { id: oldest.id },
      data: { isDefault: true },
    })
    return toArticleGroupDto(updated)
  }

  const created = await prisma.articleGroup.create({
    data: {
      id: randomUUID(),
      name: DEFAULT_GROUP_NAME,
      articleIds: [],
      isDefault: true,
    },
  })

  return toArticleGroupDto(created)
}

/** 查：拉取全部文章组（默认分组排在最前） */
export async function listArticleGroups(): Promise<ArticleGroupDto[]> {
  const groups = await prisma.articleGroup.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' },
    ],
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
      isDefault: false,
    },
  })

  return toArticleGroupDto(group)
}

/** 改：更新文章组名称（默认分组可改名，不可删除） */
export async function updateArticleGroup(
  id: string,
  input: UpdateArticleGroupInput,
): Promise<ArticleGroupDto | null> {
  const name = input.name?.trim()
  if (!name)
    throw new Error('name 必填且须为非空字符串')

  const group = await prisma.articleGroup.findUnique({ where: { id } })
  if (!group)
    return null

  const updated = await prisma.articleGroup.update({
    where: { id },
    data: { name },
  })

  return toArticleGroupDto(updated)
}

/**
 * 删：删除文章组；组内文章移至默认分组。
 * 默认分组不可删除。
 */
export async function deleteArticleGroup(id: string): Promise<boolean> {
  const group = await prisma.articleGroup.findUnique({ where: { id } })
  if (!group)
    return false

  if (group.isDefault)
    throw new Error('默认分组不可删除')

  const defaultGroup = await ensureDefaultArticleGroup()

  await prisma.$transaction(async (tx) => {
    const articles = await tx.article.findMany({
      where: { linkedGroup: id, deletedAt: null },
    })

    for (const article of articles) {
      await tx.article.update({
        where: { id: article.id },
        data: { linkedGroup: defaultGroup.id },
      })
      await removeArticleFromGroup(tx, id, article.id)
      await addArticleToGroup(tx, defaultGroup.id, article.id)
    }

    await tx.articleGroup.delete({ where: { id } })
  })

  return true
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
 * 从分组中移除一篇文章。
 * 非默认组在组内已无文章时删除该组；默认分组始终保留。
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
    if (group.isDefault) {
      await tx.articleGroup.update({
        where: { id: groupId },
        data: { articleIds: [] },
      })
      return
    }

    await tx.articleGroup.delete({ where: { id: groupId } })
    return
  }

  await tx.articleGroup.update({
    where: { id: groupId },
    data: { articleIds: nextIds },
  })
}
