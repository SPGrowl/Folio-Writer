import { useComposeStore } from '@/store'
import { resolveGroupId } from './groupSource'

const CREATE_WRITE_HINT
  = '文章已创建。首次写入完整正文可用 update_article_content；之后局部修改请用 patch_article_content。内容进入 articleChanges 待用户审阅，不会直接覆盖 draft。每次改稿前先 get_article_content。'

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
