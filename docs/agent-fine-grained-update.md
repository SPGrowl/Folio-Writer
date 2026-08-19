# Agent 细颗粒度写稿：计划与可选方案

本文记录如何把写工具从「整篇重写」扩展为「局部 patch」，以缩短 LLM 生成 tool arguments 的时间。实现前请以本文为对照；落地后若行为与本文不一致，优先改文档。

## 1. 现状与瓶颈

当前唯一写工具是 `update_article_content`，schema 要求一次性传入完整 Markdown：

- 定义：`src/agent/tool/definitions.ts`
- 校验：`src/agent/tool/updateArticleContent.ts`
- 副作用：`src/agent/control/executeTools.ts` 调用 `applyAgentChanges`

长文时，生成 `tool_calls.arguments` 的 token 数约等于正文长度。这是响应慢的主因；本地 `execute` 与 `articleChanges` 写入几乎不耗时。

### 1.1 已落地的审阅链路（可复用）

```
LLM tool args
  → executeUpdateArticleContent（校验，正文放 meta）
  → executeTools.applyAgentChanges
  → articleChanges[articleId]（单槽全文 proposed）
  → 用户 accept / reject
  → 回写 tool step reviewStatus，并从 map 删除该项
```

关键约定：

| 约定 | 说明 |
|------|------|
| 单槽 map | `Compose.TabState.articleChanges: Record<number, ArticleChange>`，与页签开闭无关 |
| 覆盖即 superseded | 新写覆盖未审旧稿时，旧 tool step 标记 `superseded` |
| 采纳即删除 | accept 后写 draft（无页签则写 `Article.content`），`delete articleChanges[id]` |
| 读工具分离 | `get_article_content` 返回 `draft` + 可选 `proposed`，`hasUnreviewedChanges` |
| 写回执瘦身 | tool 回执不含正文，只含 `reviewStatus` / `summary` / `wordCount` |

细颗粒度工具只改「完整 proposed 从哪来」，不改 map / diff / 审阅语义。

## 2. 目标

- 小改、单段润色、修错时，LLM **只生成改动片段**，而不是整篇。
- 拼出的结果仍是 **完整 proposed 字符串**，写入现有 `articleChanges`。
- UI（`DiffMarkdownEditor`：draft vs proposed）与 accept/reject **无需改交互模型**。
- 整篇重写、新建后首次写入仍走全文工具。

工具选择约定（写入 prompt / schema description）：

| 场景 | 工具 |
|------|------|
| 新建后首次写入、整篇重写、结构大改（约 >50% 正文变化） | `update_article_content` |
| 改一段、换标题句、修错别字、局部润色 | `patch_article_content`（拟新增） |

## 3. 推荐方案：search_replace（方案 A）

类似 Cursor / Aider 的编辑模式。LLM 从刚读到的 draft/proposed 原文复制 `old_text`，只生成替换内容。

### 3.1 建议 schema

```json
{
  "name": "patch_article_content",
  "parameters": {
    "article_id": "number",
    "edits": [
      {
        "old_text": "必须从 get_article_content 返回的原文精确复制，带足够上下文保证唯一",
        "new_text": "替换后的文本",
        "replace_all": false
      }
    ],
    "summary": "本次修改的 1～2 句概述"
  }
}
```

约束建议：

- `edits` 必填、非空；单次最多 5 条，按数组顺序应用。
- 默认 `replace_all: false`：`old_text` 必须在 base 中 **恰好出现一次**。
- `replace_all: true` 时替换全部出现；0 次仍报错。
- 匹配失败时 **抛错回 LLM**，不要静默跳过；错误信息写明「未找到 / 多处匹配」，并提示重新 `get_article_content`。

### 3.2 执行流程

在 `executeTools` 中与现有写工具对齐（校验在 tool execute，副作用在 executeTools）：

1. 取 base：`articleChanges[id].content ?? tab.draft ?? article.content`（有未审稿时 **基于 proposed 叠加**）。
2. 按顺序对 base 做 search/replace。
3. 得到 `fullContent` 后调用现有 `applyAgentChanges(id, fullContent, source)`。
4. 若该篇文章已有未审稿，仍走 superseded 旧 tool step。
5. tool 回执复用/扩展 `buildUpdateArticlePayload`：`reviewStatus: pending`、`draftUpdated: false`、含 `replacedExisting`、`editCount`、不含正文。

伪代码：

```ts
const base = tabStore.getChanges(id)?.content ?? readDraftContent(id).draftContent
const proposed = applyEdits(base, args.edits)
return {
  payload: buildUpdateArticlePayload(...),
  meta: { articleId: id, content: proposed },
}
```

### 3.3 为何首选

- LLM 输出从「整篇」降到「改动 + 少量上下文」。
- 与 `ArticleChange.content` 全文存储完全兼容。
- 不依赖行号、不强制稳定 heading 切分。
- 失败可重试，比静默错位更安全。

### 3.4 风险与对策

| 风险 | 对策 |
|------|------|
| `old_text` 不够独特，多处匹配 | 要求带 3～5 行上下文；非 `replace_all` 时拒绝多匹配 |
| LLM 凭记忆编造 `old_text` | prompt：patch 前必须 get；失败则重新 get，禁止改用全文盲写 |
| 空白/换行不一致导致匹配失败 | 可先做「精确匹配」；后续可加规范化空白的 fallback（需文档化，避免悄悄改错段） |
| 一次塞太多 edits | schema / prompt 限制最多 5 条 |

## 4. 可选方案

### 4.1 方案 B：按 Markdown 章节替换

读工具额外返回章节索引，写工具只提交某一节全文。

读 payload 示例：

```json
{
  "draft": { "content": "...", "wordCount": 8200 },
  "sections": [
    { "id": "s1", "heading": "引言", "lineStart": 1, "lineEnd": 12 },
    { "id": "s2", "heading": "背景", "lineStart": 13, "lineEnd": 45 }
  ]
}
```

写工具示例：

```json
{
  "article_id": 123,
  "section_id": "s2",
  "content": "该节的完整新内容"
}
```

执行：按 `lineStart/lineEnd`（或 heading 边界）替换区间，拼成全文写入 `articleChanges`。

| 优点 | 缺点 |
|------|------|
| 长文时 LLM 只生成一节 | 依赖稳定 `#` 切分 |
| 比 search_replace 更少「找不到原文」 | 改标题、合并/拆节时边界难处理 |
| | 无 heading 的散文几乎用不上 |

适合作为 **方案 A 之后的长文优化**，不作为第一版主路径。

### 4.2 方案 C：行号 / 偏移 patch（不推荐作首选）

```json
{ "startLine": 20, "endLine": 25, "newText": "..." }
```

LLM 对行号不稳定；用户改 draft 或上一轮 proposed 变化后极易错位。除非读工具返回带版本号/anchor 的快照，否则幻觉率高。**不作为第一版。**

### 4.3 方案 D：仅扩展现有全文工具（不推荐）

给 `update_article_content` 增加可选 `edits`，与 `content` 互斥。表面少一个工具，但 schema 更绕，模型更容易继续生成全文。双工具 + prompt 分流更清晰。

## 5. 与现有模块的衔接

以下 **保持不变**：

- `articleChanges` 单槽语义（`src/store/modules/composeTab/index.ts`）
- `markPendingToolSuperseded` / `patchToolStepReviewStatus`
- `DiffMarkdownEditor`（仍对比 draft vs 完整 proposed）
- accept 后删 map、reject 后删 map

建议改动点：

| 文件 | 改动 |
|------|------|
| `src/agent/tool/definitions.ts` | 新增 `patch_article_content` |
| `src/agent/tool/patchArticleContent.ts`（新） | 校验 edits、对 base 应用替换、产出 `meta.content` |
| `src/agent/tool/registry.ts` / `index.ts` | 注册新工具 |
| `src/agent/control/executeTools.ts` | 与 `update_article_content` 共用 `applyAgentChanges` 分支（可按 `meta.articleId + meta.content` 判断，避免写死工具名两次） |
| `src/agent/review/syncToolReviewStatus.ts` | 允许 `patch_article_content` 回写 reviewStatus |
| `src/agent/request/prompt.ts` | 工具选择、叠加规则、失败重试 |
| `src/agent/tool/buildArticleReadPayload.ts` | 写回执可增加 `editCount`；读 hint 提到可用 patch |
| 文案 / i18n | `compose.agent.tools.patch_article_content.*` |
| 可选 `Compose.ArticleChange` | `kind?: 'full' \| 'patch'`、`summary?`，供步骤列表展示 |

`executeTools` 中写副作用建议收敛为：凡 `result.meta?.articleId` 且 `result.meta?.content` 即 `applyAgentChanges`，这样全文/patch 共用一条路径。

## 6. Prompt 要点

在 `prompt.ts` 与工具 description 中写明：

1. **先读再改**：patch 前必须 `get_article_content`；`old_text` 从返回的 `draft` 或 `proposed` **精确复制**。
2. **工具分流**：小改用 patch；整篇重写才用 `update_article_content`。
3. **叠加**：已有未审 `proposed` 时，patch 基于 `proposed`，不要基于过期 draft。
4. **失败**：匹配失败则重新 get，不要猜测全文，也不要连续盲目 retry。
5. **成功后**：以 tool 回执 `reviewStatus: pending` 为准；不要因为 draft 未变而再提一次。

## 7. 实施阶段

### 第一阶段（建议先做）

- 新增 `patch_article_content`（search_replace + `edits[]`）。
- base 选择：`proposed ?? draft`。
- 匹配失败返回明确错误。
- prompt / schema 分流；`syncToolReviewStatus` 支持新工具名。
- 步骤列表可展示 `summary`（可选）。

验收：

- 改一段时，tool arguments 远短于全文。
- 应用后 `articleChanges` 为完整新稿，diff 正确。
- 连续两次 patch（用户未采纳）第二次基于第一次 proposed，第一次 tool 为 `superseded`。
- 采纳后 map 清空，再 get 只见更新后的 draft。
- `old_text` 不存在或多处匹配时 tool error，draft/proposed 不变。

### 第二阶段（长文读优化）

- `get_article_content` 对长文返回 `sections` 元数据。
- 或新增 `get_article_excerpt(article_id, query)` / `get_article_section`，减少为构造 `old_text` 而先读全文。

### 第三阶段（可选）

- 章节级 `replace_section`（方案 B）。
- `old_text` 空白规范化 fallback（需谨慎）。
- `ArticleChange.kind` 用于 UI 区分「全文建议 / 局部建议」。

## 8. 进一步提速（与 patch 配合，非必须）

1. **读也分段**：目录 + 按需读节，降低读工具 payload。
2. **限制单次 edits 数量**：避免拆成过多 tool round-trip。
3. **保持写回执瘦身**：正文继续不进对话历史（已做）。
4. **不要用行号作为主定位**（见方案 C）。

## 9. 明确不做什么（第一版）

- 不把 `articleChanges` 改成 patch 列表；存储仍是每篇文章一篇完整 proposed。
- 不在采纳前把 patch 直接写进 draft。
- 不删除 `update_article_content`。
- 不以行号/字符偏移作为第一版定位方式。
