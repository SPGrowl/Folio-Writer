import { useComposeStore } from '@/store'
import { t } from '@/locales'
import { resolveGroupId } from './groupSource'

const CREATE_WRITE_HINT
  = '文章已创建。写入或修改正文请使用 update_article_content(article_id, content)；内容将进入 changes 待用户审阅，不会直接覆盖 draft。'

export function formatRunningCreateArticleInGroup(
  args: Record<string, unknown>,
  _ctx: AgentStep.InitialContext | null,
): string {
  const title = typeof args.title === 'string' ? args.title.trim() : t('compose.untitled')
  return t('compose.agent.tools.create_article.running', { title })
}

export function formatDoneCreateArticleInGroup(
  _args: Record<string, unknown>,
  result: AgentStep.ToolExecuteResult,
): string {
  const title = String(result.payload.title ?? t('compose.untitled'))
  return t('compose.agent.tools.create_article.done', { title })
}

export function formatErrorCreateArticleInGroup(
  args: Record<string, unknown>,
  _ctx: AgentStep.InitialContext | null,
): string {
  const title = typeof args.title === 'string' ? args.title.trim() : t('compose.untitled')
  return t('compose.agent.tools.create_article.error', { title })
}

function resolveTitle(args: Record<string, unknown>): string {
  const raw = args.title
  if (typeof raw !== 'string')
    throw new Error('title 无效')
  const title = raw.trim()
  if (!title)
    throw new Error('title 不能为空')
  return title
}

/** 在指定分组下按标题新建文章（初始正文为占位 Markdown） */
export async function executeCreateArticleInGroup(
  args: Record<string, unknown>,
): Promise<AgentStep.ToolExecuteResult> {
  const groupId = resolveGroupId(args)
  const title = resolveTitle(args)

  const composeStore = useComposeStore()
  const group = composeStore.groups.find(item => item.id === groupId)
  if (!group)
    throw new Error(`分组 ${groupId} 不存在`)

  const initialContent = `# ${title}\n\n`
  const data = await composeStore.createArticle(initialContent, title, groupId)

  return {
    payload: {
      success: true,
      articleId: data.id,
      title: data.title ?? title,
      groupId: group.id,
      groupName: group.name,
      message: CREATE_WRITE_HINT,
    },
  }
}
