/** SSE 流式累积 assistant 消息；tool_calls 分片只在 done 前内存中合并 */
export class AssistantAccumulator {
  content = ''
  reasoning_content = ''
  private toolCalls = new Map<number, AgentApi.ToolCall>()

  apply(delta: AgentApi.StreamDelta) {
    if (delta.reasoning_content)
      this.reasoning_content += delta.reasoning_content

    if (delta.content)
      this.content += delta.content

    for (const part of delta.tool_calls ?? []) {
      const index = part.index ?? 0
      const current = this.toolCalls.get(index) ?? {
        id: '',
        type: 'function' as const,
        function: { name: '', arguments: '' },
      }

      if (part.id)
        current.id = part.id
      if (part.type)
        current.type = part.type
      if (part.function?.name)
        current.function.name += part.function.name
      if (part.function?.arguments)
        current.function.arguments += part.function.arguments

      this.toolCalls.set(index, current)
    }
  }

  finalize(): AgentStep.AssistantMessage {
    const tool_calls = [...this.toolCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => tc)
      .filter(tc => tc.id)

    return {
      role: 'assistant',
      content: this.content || undefined,
      reasoning_content: this.reasoning_content || undefined,
      tool_calls: tool_calls.length ? tool_calls : undefined,
    }
  }

  /** 流式阶段写入 store 的展示字段（不含 tool_calls） */
  getDisplayPatch(): Pick<AgentStep.AssistantStep, 'reasoning_content' | 'content'> {
    return {
      reasoning_content: this.reasoning_content || undefined,
      content: this.content || undefined,
    }
  }
}
