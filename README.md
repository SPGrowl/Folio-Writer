# Folio Writer

> **叠甲声明（求路过的大佬轻喷）**
>
> 这是一个个人学习向的二次开发，从 [ChenZhaoYu/chatgpt-web](https://github.com/Chanzhaoyu/chatgpt-web) 抠出来改的。作者不是前端/Agent 专家，很多地方是「先跑通再还债」，类型、命名、边界处理和工程化都 ded 得很明显。
>
> 若你看到离谱的 store 形状、会闪的 UI、或者「这也叫 Agent」——大概率是真的。欢迎 Issue / PR 指正，但请务必轻喷：仓库里没有测试套件，也没有人专职维护。请勿当作生产系统，也请勿把 API Key 提交进仓库。
>
> 本项目仅供学习交流，基于 MIT 协议。上游原版说明见 [README.zh.md](./README.zh.md)。

支持 **多轮对话** 与 **分组文稿创作**，并在创作页挂了一个会读/改本地文章的 **Agent 侧栏**。后端把 OpenAI 兼容接口（当前按 DeepSeek 配）做成 SSE 透传；工具执行全部在浏览器里完成。

---

## 它大概能干什么

界面分两块，侧栏顶部可在「对话 / 创作」之间切换。

### 1. 对话（Chat）

沿用原版的聊天壳，会话模型收成 `Session` + `ChatTurn`：

- Home 欢迎页输入后建会话，跳进聊天并自动打出第一轮
- 多轮上下文，标题默认取自首轮 Prompt
- 流式正文 + 可折叠的 `reasoning_content`（思考过程）
- 用户气泡可改 Prompt 后截断重发
- 多会话：切换、重命名、删除
- 思考模式请求会带 `thinking` / `reasoning_effort`（具体效果取决于上游）

同一时刻 **一个会话只能跑一条流**。这是有意收的，不是漏做并发。

### 2. 创作（Compose）

Markdown 文稿工作区，数据和对话是分开的：

- **分组 + 文章**：新建 / 重命名 / 移动 / 删除；删分组时文章进默认组
- **多页签编辑**：打开的文章有独立 draft，脏状态会提示同步
- **云端 CRUD**：`/articles`、`/article-groups`，保存时追加一条 history
- **Diff 审阅**：Agent 推过来的修改进 `articleChanges` 单槽，不直接改 draft；编辑器里对比后采纳或拒绝

### 3. 创作页的 Agent 侧栏

面向「对着当前文稿问、改」的小循环，不是通用电脑 Agent。

| 模式 | 行为 |
|------|------|
| **Ask** | 把当前文章全文塞进 system，只回答、不调工具 |
| **Agent** | system 只给文档元数据；正文靠工具读；改稿进待审槽 |

Agent 模式里的工具（前端执行）：

- 读：`list_group_articles`、`get_article_content`、`get_article_word_count`、`get_group_articles`
- 写：`patch_article_content`（局部替换，推荐）、`update_article_content`（整篇 / 首次灌入）
- 建：`create_article`（建空壳；真正写正文仍走写工具）

一次用户发送可能触发多轮：流式拿到 assistant → 若 `finish_reason === tool_calls` 则本地跑工具、把 tool 回执追加进 step 链 → 再请求，直到模型停。写工具成功只更新 `articleChanges`，**draft 要等你点采纳**。

侧栏用扁平 `steps`（user / assistant / tool）当唯一事实源。发请求时丢掉仍在 `streaming` 的占位 assistant，避免 thinking 模式因为空 assistant 缺 `reasoning_content` 而 400。工具卡片出卡时预填 `msg.running / done / error`，界面读 `msg[status]`。列表在贴底时才跟滚，上拉看历史不会被新 token 拽回去。

---

## 相对原版 ChatGPT-Web

| 方面 | 原版 | 本仓库 |
|------|------|--------|
| 会话 | `history` + `chat` 双数组 | `sessions` + `ChatTurn` |
| 协议 | `chatgpt` 库 + 自定义流 | OpenAI Chat Completions + SSE |
| 请求体 | `prompt` + `parentMessageId` | 标准 `messages` |
| 产品 | 偏聊天壳 | 聊天 + 文稿 + 写作 Agent |
| 工具 | 无 | 浏览器内 registry，服务端只透传 `tools` |

---

## 技术栈

**前端**：Vue 3 · TypeScript · Vite · Naive UI · Pinia · Vue Router · CodeMirror（正文 / Diff）

**后端**：Express · OpenAI Node SDK · 可选鉴权与限流

上游默认按 DeepSeek 兼容口配置，换别的 OpenAI 兼容服务一般只需改 `OPENAI_API_BASE_URL` / `OPENAI_API_MODEL`。thinking、tool_calls 行为以该服务为准。

---

## 核心流程（极简）

**对话**

1. Home / Chat 输入 → `sessionStore` 写入 Turn，`composeRequest` 组 `messages`
2. `POST /chat-process`，后端 SSE 透传
3. `appendAssistantDelta` 更新正文与思考，结束则 `finishTurn`

**Agent**

1. 发送前快照当前页签为 `documentContext`（只要元数据）
2. `runTurn`：push streaming assistant → `buildRequest`（跳过 streaming 占位）→ `/agent-process`
3. 需要工具则 `executeTools` 查 registry，写工具走 `applyAgentChanges`
4. tool step 进同一条 step 链，进入下一轮 LLM

更碎的记录见 [`docs/开发日志.md`](./docs/开发日志.md)；patch 工具设计备忘见 [`docs/agent-fine-grained-update.md`](./docs/agent-fine-grained-update.md)（文中部分段落可能落后于代码）。

---

## 目录结构

```
folio-writer/
├── docs/                          # 开发日志、设计备忘
├── src/
│   ├── agent/                     # Agent：请求、子循环、工具、审阅回写
│   ├── api/                       # 对话流 + 文章/分组 REST
│   ├── store/modules/
│   │   ├── session/               # 对话会话
│   │   ├── compose/               # 文章与分组数据源
│   │   ├── composeTab/            # 页签、draft、articleChanges
│   │   └── agent/                 # Agent 多页签 + steps
│   ├── views/chat/
│   │   ├── home/                  # 欢迎页
│   │   ├── index.vue              # 对话页
│   │   └── compose/               # 创作编辑器 + Agent 侧栏
│   └── utils/stream/              # 共用 SSE 解析
└── service/src/
    ├── routes/                    # chat-process / agent-process / articles
    └── oepnai/                    # 拼写就长这样，OpenAI 客户端与流式透传
```

---

## 快速开始

### 环境要求

- Node.js `^16 || ^18 || ^20`
- pnpm

### 1. 配置后端

```bash
cd service
cp .env.example .env
```

编辑 `service/.env`，至少填写：

```env
OPENAI_API_KEY=your_api_key
OPENAI_API_BASE_URL=https://api.deepseek.com
OPENAI_API_MODEL=deepseek-v4-pro
```

可选：`AUTH_SECRET_KEY` 开启访问鉴权（前端 Settings 或 `/verify`）。

### 2. 安装依赖

```bash
# 后端
cd service && pnpm install

# 前端（项目根目录）
pnpm bootstrap
```

### 3. 启动

```bash
# 终端 1：后端（端口 3002）
cd service && pnpm dev

# 终端 2：前端
pnpm dev
```

前端默认把 `/api` 代理到后端。浏览器打开 Vite 给出的本地地址即可。本仓库只维护前后端独立启动与手动打包，不提供 Docker / Kubernetes / Railway 等部署方式。

---

## 已知不足（真的挺多）

下面不是谦虚话术，是作者自己也觉得别扭、但还没清完的债。大佬若要喷，优先喷这些就行。

### 工程

- **几乎没有测试。** 工具替换、审阅状态、step 截断全靠手点。
- **Agent 会话不持久化。** 刷新侧栏对话就没了；文章在服务端，Agent steps 只在内存。
- **不支持多 Agent 会话并发。** 切页签会 abort 当前任务。对话侧同样是单飞。
- **服务端基本是个管道。** `mode` / `documentContext` 还没参与 prompt 编排，工具也不在服务端跑，没法做鉴权到「哪篇文章能改」。
- 目录里仍有 `toolStub`、注释掉的旧 chatgpt 协议、以及 `service/src/oepnai` 这种历史拼写。
- 上游原版说明见 [README.zh.md](./README.zh.md)，其中部分接口与产品描述可能落后于本仓库。

### 产品 / UX

- 流式进行中仍可能点到重试、改 Prompt（对话页旧问题）。
- 请求失败没有像样的自动重试和统一错误层。
- Agent 文案目前写死中文，和 locale 文件是两套。
- Ask 把全文塞进 system，长文会很贵、也容易超上下文；Agent 全靠模型自觉去调 `get_article_content`。
- `patch_article_content` 要求 `oldText` 精确唯一匹配，模型偶尔会匹配失败然后空转。
- 待审槽是按文章单槽覆盖：连续两版没点采纳，旧的会标 `superseded`。
- 只有文本。没有附件、图片、引用多篇以外的「工作区」。
- 移动端创作 + Agent 基本没按真机打磨过。

### Agent 能力边界

- 不会用终端、不会上网、不会改仓库文件。它只能动这个应用里的分组和 Markdown。
- 工具循环没有步数上限、没有人类确认门（除了写稿后的 diff）。模型若乱调 `get_group_articles` 会把整组正文塞回上下文。
- `create_article` 会立刻在 compose store 里建文，和 patch/update 的「先待审」不是同一套语义，容易让人误会。

---

## 后期想往哪走

只是方向，不是排期。做不做、何时做，都随缘。

### 近期（先把现有路径补牢）

- [ ] 对话：流式中禁用编辑/重试；Abort 后标记「已停止」
- [ ] Agent steps 可选落盘（localStorage 或跟文章绑定），刷新不丢
- [ ] 工具循环加最大步数、未知工具/匹配失败的更清楚回执
- [ ] 把工具展示文案接回 i18n；清掉 stub 和死代码
- [ ] 失败态：鉴权过期、上游 4xx/5xx 的统一提示

### 中期（架构）

- [ ] 按会话的 AbortController，A 在生成时 B 仍可聊
- [ ] `composeRequest` / Agent 上下文策略可配（最近 N 轮、按 token 截断）
- [ ] 服务端真正编排 system / tools，而不是纯透传
- [ ] JSON 导入导出、设置页里的备份恢复
- [ ] 给 patch / 审阅链路补测试（至少 round-trip 几条 edits）

### 远期（有需求再做）

- [ ] 多模态：图片、文件进 Turn / 文章
- [ ] 账号与服务端持久化（SQLite / Postgres），localStorage 当缓存
- [ ] 导出 Markdown / PDF
- [ ] 更像编辑器的 Agent：选区作为上下文、行级评论、多文件工作区

---

## 说明

- 请自行准备 API Key，**不要提交 `.env`。**
- 模型与工具调用以你使用的上游为准；本仓库不捆绑任何付费接口。
- 再次叠甲：代码有味道是预期现象。若它帮你少走弯路，开心就好；若它冒犯了你的审美，关掉页面即可，不必内伤。

感谢 [ChenZhaoYu](https://github.com/Chanzhaoyu) 的原项目。

## License

MIT
