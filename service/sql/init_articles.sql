-- GPT-Web 文章（创作）表初始化脚本
-- 对齐前端 Compose.Article / Compose.history（src/typings/cmopose.d.ts）
-- 无用户层级；历史版本单独成表，一条历史一行
--
-- 前置：请先执行 sql/init.sql 创建 gpt_web 库，或确保库已存在
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/init_articles.sql

-- ---------------------------------------------------------------------------
-- 文章表：对应 Compose.Article（不含 history 数组）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id          BIGSERIAL PRIMARY KEY,
  title       VARCHAR(256) NOT NULL DEFAULT '未命名文章',
  content     TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_articles_updated
  ON articles (updated_at DESC);

-- ---------------------------------------------------------------------------
-- 文章历史表：对应 Compose.history[]，一条历史一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_history (
  id           BIGSERIAL PRIMARY KEY,
  article_id   BIGINT       NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  content      TEXT         NOT NULL,
  insert_time  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_history_article_time
  ON article_history (article_id, insert_time DESC);
