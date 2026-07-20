import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

/** PostgreSQL 连接池，默认 localhost:5432 / postgres / gpt_web */
export const pool = new Pool({
  host: process.env.PG_HOST ?? 'localhost',
  port: Number(process.env.PG_PORT ?? 5432),
  user: process.env.PG_USER ?? 'postgres',
  password: process.env.PG_PASSWORD ?? 'postgre',
  database: process.env.PG_DATABASE ?? 'gpt_web',
  max: 10,
})

export async function testConnection() {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  }
  finally {
    client.release()
  }
}
