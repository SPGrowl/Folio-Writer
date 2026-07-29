-- GPT-Web 文章历史表升级：新增 message 字段（git commit message）
-- 适用：已有 article_history 表但尚无 message 列的数据库
-- 可重复执行（幂等）
--
-- 用法：
--   psql -U postgres -h localhost -p 5432 -d gpt_web -f sql/migrate_article_history_message.sql

ALTER TABLE article_history
  ADD COLUMN IF NOT EXISTS message VARCHAR(512) NOT NULL DEFAULT '';

COMMENT ON COLUMN article_history.message IS '版本提交说明，对应 git -m / Compose.History.message';
