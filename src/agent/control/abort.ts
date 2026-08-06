let currentController: AbortController | null = null

/** 开始可中断任务，若有进行中的请求则先 abort */
export function beginAbortableTask(): AbortSignal {
  currentController?.abort()
  currentController = new AbortController()
  return currentController.signal
}

export function abortCurrentTask() {
  currentController?.abort()
  currentController = null
}

export function getCurrentAbortSignal(): AbortSignal | undefined {
  return currentController?.signal
}
