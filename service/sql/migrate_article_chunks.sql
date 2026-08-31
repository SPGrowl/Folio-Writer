-- 文章向量切片表（pgvector）
-- 前置：PostgreSQL 已安装 pgvector 扩展（镜像如 pgvector/pgvector 或手动编译）
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/migrate_article_chunks.sql
--
-- 服务启动时也会 ensureVectorStore() 幂等执行同等 DDL。

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- embedding 维度默认 1536（text-embedding-3-small）；更换模型维度后需重建本表
CREATE TABLE IF NOT EXISTS article_chunks (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    BIGINT       NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  group_id      VARCHAR(256) NOT NULL DEFAULT '',
  title         VARCHAR(256) NOT NULL DEFAULT '',
  chunk_index   INT          NOT NULL,
  content       TEXT         NOT NULL,
  start_offset  INT,
  end_offset    INT,
  embedding     vector(1536) NOT NULL,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_chunks_article
  ON article_chunks (article_id);

CREATE INDEX IF NOT EXISTS idx_article_chunks_group
  ON article_chunks (group_id);

-- 余弦距离近似检索（数据量增大后再调参）
CREATE INDEX IF NOT EXISTS idx_article_chunks_embedding_hnsw
  ON article_chunks
  USING hnsw (embedding vector_cosine_ops);
