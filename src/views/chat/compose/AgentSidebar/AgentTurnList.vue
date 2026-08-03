<script setup lang="ts">
import { computed } from 'vue'
import { useAgentStore } from '@/store'
import AgentContextBar from './AgentContextBar.vue'
import AgentUserBubble from './AgentUserBubble.vue'
import AgentReplyText from './AgentReplyText.vue'
import AgentToolCallLine from './AgentToolCallLine.vue'

const agentStore = useAgentStore()

const turns = computed(() => agentStore.activeTurns)

function assistantText(turn: Agent.Turn) {
  if (turn.run.status === 'streaming' || turn.run.status === 'tool_running') {
    const step = turn.run.steps[turn.run.steps.length - 1]
    return step?.partialText ?? turn.run.finalText
  }
  return turn.run.finalText
}

function assistantReasoning(turn: Agent.Turn) {
  return turn.run.steps.map(step => step.reasoning).filter(Boolean).join('\n')
}

function toolInvocations(turn: Agent.Turn) {
  return turn.run.steps.flatMap(step => step.invocations)
}

function replyLoading(turn: Agent.Turn) {
  return turn.run.status === 'streaming' && !assistantText(turn)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <AgentContextBar />

    <div
      v-for="turn in turns"
      :key="turn.turnIndex"
      class="flex flex-col gap-1.5"
    >
      <AgentUserBubble :text="turn.user.text" />

      <div
        v-if="toolInvocations(turn).length"
        class="flex flex-col gap-0.5 pl-1"
      >
        <AgentToolCallLine
          v-for="inv in toolInvocations(turn)"
          :key="inv.id"
          :invocation="inv"
        />
      </div>

      <AgentReplyText
        :text="assistantText(turn)"
        :reasoning="assistantReasoning(turn)"
        :loading="replyLoading(turn)"
        :error="turn.run.status === 'error'"
      />
    </div>
  </div>
</template>
