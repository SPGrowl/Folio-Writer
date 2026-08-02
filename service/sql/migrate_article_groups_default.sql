-- GPT-Web 文章分组：新增 is_default 列并确保存在不可删除的默认分组
-- 可重复执行（幂等）
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/migrate_article_groups_default.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE article_groups
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN article_groups.is_default IS '是否为系统默认分组（不可删除）';

-- 若尚无默认分组，将最早创建的分组标记为默认
UPDATE article_groups
SET is_default = true
WHERE id = (
  SELECT id
  FROM article_groups
  ORDER BY created_at ASC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM article_groups WHERE is_default = true);

-- 若完全无分组，插入默认分组
INSERT INTO article_groups (id, name, article_ids, is_default)
SELECT gen_random_uuid(), '默认分组', '{}', true
WHERE NOT EXISTS (SELECT 1 FROM article_groups);
