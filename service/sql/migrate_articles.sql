-- GPT-Web 文章表结构升级脚本
-- 从旧版 init_articles.sql（无 linked_group、history.id 为 BIGSERIAL）
-- 升级至对齐 src/typings/cmopose.d.ts：
--   - articles 增加 linked_group（Compose.Article.linkedGroup）
--   - article_history.id 改为 UUID（Compose.history.id 为 string）
--
-- 适用：已执行过旧版 init_articles.sql 的数据库
-- 可重复执行（幂等）
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/migrate_articles.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. 文章表：新增 linked_group
-- ---------------------------------------------------------------------------
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS linked_group VARCHAR(256) NOT NULL DEFAULT '';

COMMENT ON COLUMN articles.linked_group IS '前端 Compose.Article.linkedGroup，关联分组标识';

CREATE INDEX IF NOT EXISTS idx_articles_linked_group
  ON articles (linked_group);

-- ---------------------------------------------------------------------------
-- 2. 历史表：id 从 BIGSERIAL(bigint) 迁移为 UUID
--    若已是 uuid 类型则跳过
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'article_history'
  ) THEN
    RAISE NOTICE 'article_history 表不存在，请先执行 init_articles.sql';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'article_history'
      AND column_name = 'id'
      AND udt_name = 'int8'
  ) THEN
    -- 新建 UUID 列并为已有行生成新 id
    ALTER TABLE article_history
      ADD COLUMN IF NOT EXISTS id_uuid UUID;

    UPDATE article_history
    SET id_uuid = gen_random_uuid()
    WHERE id_uuid IS NULL;

    ALTER TABLE article_history
      ALTER COLUMN id_uuid SET NOT NULL;

    -- 去掉旧主键与 bigint id 列
    ALTER TABLE article_history
      DROP CONSTRAINT IF EXISTS article_history_pkey;

    ALTER TABLE article_history
      DROP COLUMN id;

    ALTER TABLE article_history
      RENAME COLUMN id_uuid TO id;

    ALTER TABLE article_history
      ADD PRIMARY KEY (id);

    ALTER TABLE article_history
      ALTER COLUMN id SET DEFAULT gen_random_uuid();

    RAISE NOTICE 'article_history.id 已从 BIGSERIAL 迁移为 UUID';
  ELSE
    RAISE NOTICE 'article_history.id 已是 UUID 或非 bigint，跳过迁移';
  END IF;
END $$;
