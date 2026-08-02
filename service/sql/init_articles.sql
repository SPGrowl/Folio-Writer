-- GPT-Web 文章（创作）表初始化脚本
-- 对齐前端 Compose.Article / Compose.history（src/typings/cmopose.d.ts）
-- 无用户层级；历史版本单独成表，一条历史一行
--
-- 字段对照：
--   articles.id            -> Compose.Article.id          (number, BIGSERIAL)
--   articles.title         -> Compose.Article.title
--   articles.content       -> Compose.Article.content
--   articles.linked_group  -> Compose.Article.linkedGroup (string, UUID)
--   article_groups.id      -> 分组唯一标识
--   article_groups.name    -> 分组名称
--   article_groups.article_ids -> 本组包含的文章 id 列表
--   articles.created_at    -> Compose.Article.createdAt
--   articles.updated_at    -> Compose.Article.updatedAt
--   article_history.id          -> Compose.History.id          (UUID string)
--   article_history.message     -> Compose.History.message     (commit message，类似 git -m)
--   article_history.insert_time -> Compose.History.insertTime
--   article_history.content     -> Compose.History.content
--
-- 前置：请先执行 sql/init.sql 创建 gpt_web 库，或确保库已存在
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/init_articles.sql

-- UUID 主键默认值（PostgreSQL 13+ 内置 gen_random_uuid，低版本需 pgcrypto 扩展）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 文章表：对应 Compose.Article（不含 history 数组）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         VARCHAR(256) NOT NULL DEFAULT '未命名文章',
  content       TEXT         NOT NULL DEFAULT '',
  linked_group  VARCHAR(256) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_articles_updated
  ON articles (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_linked_group
  ON articles (linked_group);

-- ---------------------------------------------------------------------------
-- 文章分组表：每组有唯一 UUID、名称及所含文章 ID 列表
--   article_groups.id           -> 分组唯一标识（articles.linked_group 引用）
--   article_groups.name         -> 分组名称
--   article_groups.article_ids  -> 本组包含的文章 id 数组
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_groups (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(256) NOT NULL DEFAULT '未命名分组',
  article_ids  BIGINT[]     NOT NULL DEFAULT '{}',
  is_default   BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 默认分组（不可删除）
INSERT INTO article_groups (id, name, article_ids, is_default)
SELECT gen_random_uuid(), '默认分组', '{}', true
WHERE NOT EXISTS (SELECT 1 FROM article_groups WHERE is_default = true);

-- ---------------------------------------------------------------------------
-- 文章历史表：对应 Compose.History[]，一条版本一行（类似 git commit）
-- id：UUID 唯一版本号；message：提交说明（git -m）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_history (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   BIGINT       NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  message      VARCHAR(512) NOT NULL DEFAULT '',
  content      TEXT         NOT NULL,
  insert_time  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_history_article_time
  ON article_history (article_id, insert_time DESC);
