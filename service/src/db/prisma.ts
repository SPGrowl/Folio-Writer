import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

/** 若未配置 DATABASE_URL，则从 PG_* 环境变量拼装（与 pool.ts 默认一致） */
if (!process.env.DATABASE_URL) {
  const host = process.env.PG_HOST ?? 'localhost'
  const port = process.env.PG_PORT ?? '5432'
  const user = encodeURIComponent(process.env.PG_USER ?? 'postgres')
  const password = encodeURIComponent(process.env.PG_PASSWORD ?? 'postgre')
  const database = process.env.PG_DATABASE ?? 'gpt_web'
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`
}

/** 开发热重载时复用同一 PrismaClient，避免连接数暴涨 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production')
  globalForPrisma.prisma = prisma

export async function testPrismaConnection() {
  await prisma.$queryRaw`SELECT 1`
}
