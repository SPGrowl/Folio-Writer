import { t } from '@/locales'

export function formatToolStepLine(step: AgentStep.ToolStep): string {
  if (step.msg?.trim())
    return step.msg.trim()

  const target = t('compose.agent.toolDefaultTarget')

  if (step.status === 'running')
    return t('compose.agent.toolRunning', { target })

  if (step.status === 'error')
    return t('compose.agent.toolError', { target })

  return t('compose.agent.toolDone', { target })
}

export function isAssistantLoading(step: AgentStep.AssistantStep): boolean {
  if (step.status !== 'streaming')
    return false
  return !step.content?.trim() && !step.reasoning_content?.trim()
}

export function formatSessionTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime()))
    return iso

  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${m}-${d} ${h}:${min}`
}
