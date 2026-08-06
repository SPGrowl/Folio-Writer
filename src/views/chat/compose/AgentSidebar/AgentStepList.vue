<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NInput } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { sendAgentMessage } from '@/agent/control'
import { t } from '@/locales'
import { formatToolStepLine, isAssistantLoading } from './stepView'
import AssistantMarkdown from './AssistantMarkdown.vue'

const props = defineProps<{
  steps: AgentStep.Step[]
  isRunning: boolean
}>()

const reasoningExpanded = ref<Record<number, boolean>>({})
const editingUserIndex = ref<number | null>(null)
const editDraft = ref('')

watch(() => props.isRunning, (running) => {
  if (running)
    cancelEdit()
})

watch(() => props.steps, () => {
  if (editingUserIndex.value == null)
    return
  const step = props.steps[editingUserIndex.value]
  if (!step || step.role !== 'user')
    cancelEdit()
})

function isReasoningOpen(index: number) {
  return reasoningExpanded.value[index] !== false
}

function toggleReasoning(index: number) {
  reasoningExpanded.value[index] = !isReasoningOpen(index)
}

function toolIcon(step: AgentStep.ToolStep) {
  if (step.status === 'running')
    return 'ri:loader-4-line'
  if (step.status === 'error')
    return 'ri:error-warning-line'
  return 'ri:check-line'
}

function startEdit(step: AgentStep.UserStep) {
  if (props.isRunning)
    return
  editingUserIndex.value = step.index
  editDraft.value = step.content
}

function cancelEdit() {
  editingUserIndex.value = null
  editDraft.value = ''
}

async function submitEdit(userStepIndex: number) {
  const text = editDraft.value.trim()
  if (!text || props.isRunning)
    return

  cancelEdit()
  await sendAgentMessage(text, userStepIndex)
}

function handleEditKeydown(event: KeyboardEvent, userStepIndex: number) {
  if (event.key !== 'Enter' || event.shiftKey)
    return
  event.preventDefault()
  submitEdit(userStepIndex)
}
</script>

<template>
  <div class="agent-step-list flex flex-col gap-4">
    <template v-for="step in steps" :key="step.index">
      <!-- user -->
      <div v-if="step.role === 'user'" class="flex justify-end">
        <div
          v-if="editingUserIndex !== step.index"
          class="group max-w-[92%] cursor-pointer rounded-xl rounded-tr-sm bg-[#4b9e5f]/10 px-3 py-2 text-xs leading-relaxed text-neutral-800 break-words whitespace-pre-wrap transition hover:bg-[#4b9e5f]/15 dark:bg-[#4b9e5f]/15 dark:text-neutral-100 dark:hover:bg-[#4b9e5f]/20"
          :class="{ 'pointer-events-none opacity-60': isRunning }"
          @click="startEdit(step)"
        >
          {{ step.content }}
        </div>

        <div
          v-else
          class="w-full max-w-[92%] rounded-xl border border-[#4b9e5f]/30 bg-white p-2 dark:border-[#4b9e5f]/40 dark:bg-[#242428]"
        >
          <NInput
            v-model:value="editDraft"
            type="textarea"
            class="agent-user-edit-input"
            :autosize="{ minRows: 2, maxRows: 8 }"
            autofocus
            @keydown="handleEditKeydown($event, step.index)"
          />
          <div class="mt-2 flex justify-end gap-2">
            <NButton size="tiny" quaternary @click="cancelEdit">
              {{ t('bubble.cancel') }}
            </NButton>
            <NButton
              size="tiny"
              type="primary"
              :disabled="!editDraft.trim() || isRunning"
              @click="submitEdit(step.index)"
            >
              {{ t('bubble.send') }}
            </NButton>
          </div>
        </div>
      </div>

      <!-- assistant -->
      <div v-else-if="step.role === 'assistant'" class="flex flex-col items-start gap-2">
        <div
          v-if="step.reasoning_content?.trim()"
          class="w-full max-w-full"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs text-neutral-500 transition hover:text-neutral-700 dark:text-[#8b929a] dark:hover:text-[#b4bbc4]"
            @click="toggleReasoning(step.index)"
          >
            <SvgIcon icon="mdi:atom" class="text-sm text-[#4b9e5f]" />
            <span v-if="step.status === 'streaming'">{{ t('chat.thinking') }}</span>
            <span v-else>{{ t('chat.thinkingFinished') }}</span>
            <SvgIcon
              :icon="isReasoningOpen(step.index) ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'"
              class="text-sm"
            />
          </button>
          <div
            v-show="isReasoningOpen(step.index)"
            class="mt-2 border-l border-neutral-300 pl-3 text-xs leading-relaxed text-neutral-500 break-words whitespace-pre-wrap dark:border-[#3d4450] dark:text-[#8b929a]"
          >
            {{ step.reasoning_content }}
          </div>
        </div>

        <AssistantMarkdown
          v-if="step.content?.trim()"
          :content="step.content"
          :streaming="step.status === 'streaming'"
        />

        <div
          v-else-if="isAssistantLoading(step)"
          class="inline-flex items-center gap-1.5 text-xs text-neutral-400"
        >
          <SvgIcon icon="ri:loader-4-line" class="animate-spin text-sm" />
          <span>{{ t('chat.thinking') }}</span>
        </div>

        <p
          v-if="step.status === 'error' && step.error"
          class="text-xs text-red-500"
        >
          {{ step.error }}
        </p>
      </div>

      <!-- tool：单行状态 -->
      <div
        v-else-if="step.role === 'tool'"
        class="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-[#8b929a]"
      >
        <SvgIcon
          :icon="toolIcon(step)"
          class="shrink-0 text-sm"
          :class="{ 'animate-spin text-[#4b9e5f]': step.status === 'running' }"
        />
        <span>{{ formatToolStepLine(step) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.agent-user-edit-input :deep(.n-input-wrapper) {
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}
</style>
