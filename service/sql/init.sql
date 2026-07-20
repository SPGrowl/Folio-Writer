-- GPT-Web 数据库初始化脚本（无用户层级，一条消息一行）
--
-- 用法 1：创建库并建表（Windows / Linux 通用）
--   psql -U postgres -h localhost -p 5432 -f sql/init.sql
--
-- 用法 2：若库已存在，仅执行下方「连接到 gpt_web 后的 DDL」部分

-- ---------------------------------------------------------------------------
-- 创建数据库（若已存在会报错，可忽略并手动 \c gpt_web 后执行 DDL）
-- ---------------------------------------------------------------------------
CREATE DATABASE gpt_web
  WITH ENCODING 'UTF8'
       TEMPLATE template0;

-- psql 专用：切换到目标库（非 psql 客户端请手动连接到 gpt_web 再执行下方语句）
-- \c gpt_web

-- ---------------------------------------------------------------------------
-- 连接到 gpt_web 后的 DDL
-- ---------------------------------------------------------------------------

-- 会话表：仅存会话元数据，不含用户字段
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          BIGSERIAL PRIMARY KEY,
  uuid        BIGINT       NOT NULL UNIQUE,
  title       VARCHAR(256) NOT NULL DEFAULT '新对话',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated
  ON chat_sessions (updated_at DESC);

-- 消息表：一条消息一行，按 seq 排序组成对话
CREATE TABLE IF NOT EXISTS chat_messages (
  id                 BIGSERIAL PRIMARY KEY,
  session_id         BIGINT       NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  seq                INT          NOT NULL,
  role               VARCHAR(16)  NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content            TEXT,
  reasoning_content  TEXT,
  error              BOOLEAN      NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_seq
  ON chat_messages (session_id, seq);
