export function formatToolStepLine(step: AgentStep.ToolStep): string {
  return step.msg[step.status]?.trim() || '文档'
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
