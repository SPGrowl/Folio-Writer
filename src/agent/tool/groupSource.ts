import { useComposeStore } from '@/store'
import { t } from '@/locales'

export function resolveGroupId(args: Record<string, unknown>): string {
  const raw = args.group_id ?? args.groupId
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id)
    throw new Error('group_id 无效')
  return id
}

export function resolveGroupMeta(
  args: Record<string, unknown>,
  ctx: AgentStep.InitialContext | null,
): { groupId: string, groupName: string, count: number } {
  const raw = args.group_id ?? args.groupId
  const groupId = typeof raw === 'string' ? raw.trim() : ''

  if (!groupId) {
    return {
      groupId: ctx?.groupId ?? '',
      groupName: ctx?.groupName || t('compose.agent.toolDefaultTarget'),
      count: 0,
    }
  }

  const composeStore = useComposeStore()
  const group = composeStore.groups.find(item => item.id === groupId)
  return {
    groupId,
    groupName: group?.name ?? ctx?.groupName ?? groupId,
    count: composeStore.articlesByGroup(groupId).length,
  }
}
