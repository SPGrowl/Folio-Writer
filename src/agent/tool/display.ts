import { resolveArticleTitle } from './articleSource'
import { resolveGroupMeta } from './groupSource'

const COPY_ALIAS: Record<string, string> = {
  patch_article_content: 'update_article_content',
}

/** 与 ToolStep.status 同键，可直接 copy[status] */
type ToolCopy = Record<AgentStep.ToolStatus, string> & {
  /** 仅写入 msg.done 的变体，不是第四种 status */
  donePending?: string
}

const TOOL_DISPLAY: Record<string, ToolCopy> = {
  create_article: {
    running: '正在创建文章《{title}》',
    done: '已创建文章《{title}》',
    error: '创建文章《{title}》失败',
  },
  update_article_content: {
    running: '正在提交《{title}》的修改建议',
    done: '已提交《{title}》的修改建议，待用户审阅',
    error: '提交《{title}》修改建议失败',
  },
  list_group_articles: {
    running: '正在查看《{groupName}》组中 {count} 篇文章的目录',
    done: '已查看《{groupName}》组 {count} 篇文章的目录',
    error: '查看《{groupName}》组文章目录失败',
  },
  get_article_content: {
    running: '正在阅读《{title}》的内容',
    done: '已阅读《{title}》，共 {count} 字',
    error: '阅读《{title}》失败',
    donePending: '已阅读《{title}》（draft {count} 字，含待审改动）',
  },
  get_article_word_count: {
    running: '正在统计《{title}》的字数',
    done: '已统计《{title}》的字数，共 {count} 字',
    error: '统计《{title}》字数失败',
  },
  get_group_articles: {
    running: '正在阅读《{groupName}》组中 {count} 篇文章的内容',
    done: '已阅读《{groupName}》组 {count} 篇文章的内容',
    error: '阅读《{groupName}》组文章失败',
  },
}

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(title|count|groupName)\}/g, (_, key: string) => String(vars[key] ?? ''))
}

function toolVars(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
  result?: AgentStep.ToolExecuteResult,
): Record<string, string | number> {
  const payload = result?.payload ?? {}
  const group = resolveGroupMeta(args, ctx)
  const argTitle = typeof args.title === 'string' ? args.title.trim() : ''

  return {
    title: String((payload.title ?? argTitle) || resolveArticleTitle(args, ctx)),
    groupName: String(payload.groupName ?? group.groupName),
    count: Number(
      payload.count ?? payload.draftWordCount ?? payload.wordCount ?? group.count ?? 0,
    ),
  }
}

function resolveCopy(toolName: string): ToolCopy | undefined {
  return TOOL_DISPLAY[COPY_ALIAS[toolName] ?? toolName]
}

function fallbackMsg(vars: Record<string, string | number>): Record<AgentStep.ToolStatus, string> {
  const target = String(vars.title || vars.groupName || '文档')
  return {
    running: `正在处理${target}`,
    done: `已处理${target}`,
    error: `处理${target}失败`,
  }
}

/** 派生 ToolStep 时一次填好 running / done / error */
export function buildToolMsg(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): Record<AgentStep.ToolStatus, string> {
  const copy = resolveCopy(toolName)
  const vars = toolVars(args, ctx)
  if (!copy)
    return fallbackMsg(vars)

  return {
    running: fill(copy.running, vars),
    done: fill(copy.done, vars),
    error: fill(copy.error, vars),
  }
}

/** execute 成功后按 payload 重写 done 槽（含待审变体） */
export function formatDoneSlot(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
  result: AgentStep.ToolExecuteResult,
): string {
  const copy = resolveCopy(toolName)
  const vars = toolVars(args, ctx, result)
  if (!copy)
    return fallbackMsg(vars).done

  const template = result.payload.hasUnreviewedChanges && copy.donePending
    ? copy.donePending
    : copy.done
  return fill(template, vars)
}
