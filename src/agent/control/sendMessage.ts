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

  syncDocumentContextFromActiveTab()

  if (resendUserIndex != null) {
    store.patchStepAt(resendUserIndex, { content: trimmed })
    if (!store.truncateStepsAfter(resendUserIndex))
      return false
  }
  else if (!store.pushUserStep(trimmed)) {
    return false
  }

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
