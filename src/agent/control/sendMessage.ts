import { useAgentStore } from '@/store'
import { abortCurrentTask, beginAbortableTask } from './abort'
import { runTurn } from './runTurn'
import { syncDocumentContextFromActiveTab } from './syncDocumentContext'

export async function sendAgentMessage(text: string, resendUserIndex?: number) {
  const store = useAgentStore()
  if (store.isRunning)
    return false

  const trimmed = text.trim()
  if (!trimmed)
    return false

  // 设置初始上下文
  syncDocumentContextFromActiveTab()

  // 重发时截断上下文
  if (resendUserIndex != null) {
    // 重写最后一步userStep
    store.patchStepAt(resendUserIndex, { content: trimmed })
    // 截断上下文
    if (!store.truncateStepsAfter(resendUserIndex))
      return false
  }
  else if (!store.pushUserStep(trimmed)) {
    return false
  }

  // 创建一个可中断的任务
  const signal = beginAbortableTask()

  try {
    await runTurn(signal)
    return true
  }
  catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError'))
      throw error
    return false
  }
  finally {
    store.setRunning(null)
    abortCurrentTask()
  }
}

export function abortAgentMessage() {
  abortCurrentTask()
  useAgentStore().abortRunning()
}
