-- GPT-Web 文章分组表迁移脚本
-- 为已有数据库新增 article_groups 表，并为 linked_group 为空的文章补建分组
--
-- 适用：已执行过 init_articles.sql（含 linked_group 列）但尚无 article_groups 表
-- 可重复执行（幂等）
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/migrate_article_groups.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. 文章分组表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS article_groups (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(256) NOT NULL DEFAULT '未命名分组',
  article_ids  BIGINT[]     NOT NULL DEFAULT '{}',
  is_default   BOOLEAN      NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE article_groups IS '文章分组：唯一 UUID、组名、所含文章 ID 列表';
COMMENT ON COLUMN article_groups.id IS '分组唯一标识，对应 articles.linked_group';
COMMENT ON COLUMN article_groups.article_ids IS '本组包含的文章 id 数组';

-- ---------------------------------------------------------------------------
-- 2. 为 linked_group 为空的文章各建一个独立分组
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  new_group_id UUID;
BEGIN
  FOR r IN
    SELECT id, title
    FROM articles
    WHERE deleted_at IS NULL
      AND (linked_group IS NULL OR linked_group = '')
  LOOP
    new_group_id := gen_random_uuid();

    INSERT INTO article_groups (id, name, article_ids)
    VALUES (new_group_id, r.title, ARRAY[r.id]);

    UPDATE articles
    SET linked_group = new_group_id::text
    WHERE id = r.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. 为已有 linked_group 但缺少分组记录的文章补建分组行
--    （同一 linked_group 的多篇文章归入同一组）
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT linked_group AS group_id, array_agg(id ORDER BY id) AS ids, min(title) AS name
    FROM articles
    WHERE deleted_at IS NULL
      AND linked_group IS NOT NULL
      AND linked_group <> ''
      AND NOT EXISTS (
        SELECT 1 FROM article_groups g WHERE g.id::text = articles.linked_group
      )
    GROUP BY linked_group
  LOOP
    INSERT INTO article_groups (id, name, article_ids)
    VALUES (r.group_id::uuid, r.name, r.ids)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
