<script setup lang="ts">
import { computed, ref } from 'vue'
import TextComponent from '@/views/chat/components/Bubble/Text.vue'
import { SvgIcon } from '@/components/common'

const props = defineProps<{
  text: string | null
  reasoning?: string
  loading?: boolean
  error?: boolean
}>()

const reasoningExpanded = ref(false)

const hasReasoning = computed(() => !!props.reasoning?.trim())
const displayText = computed(() => props.text ?? '')
</script>

<template>
  <div class="flex justify-start">
    <div class="max-w-full min-w-0">
      <div
        v-if="hasReasoning"
        class="mb-1.5 rounded-md border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/40"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1 px-2 py-1 text-[10px] text-neutral-500 dark:text-neutral-400"
          @click="reasoningExpanded = !reasoningExpanded"
        >
          <SvgIcon
            :icon="reasoningExpanded ? 'ri:arrow-down-s-line' : 'ri:arrow-right-s-line'"
            class="text-xs"
          />
          {{ $t('compose.agent.thinking') }}
        </button>
        <div
          v-show="reasoningExpanded"
          class="max-h-32 overflow-y-auto whitespace-pre-wrap break-words border-t border-neutral-200 px-2 py-1.5 text-[10px] leading-relaxed text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
        >
          {{ reasoning }}
        </div>
      </div>

      <div
        class="agent-reply-text rounded-lg border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-[#1f1f23]"
        :class="{ 'border-red-300 dark:border-red-800': error }"
      >
        <TextComponent
          :text="displayText"
          :loading="loading"
          :error="error"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-reply-text :deep(.text-wrap) {
  padding: 0.25rem 0.375rem;
  font-size: 11px;
  line-height: 1.55;
}

.agent-reply-text :deep(.markdown-body) {
  font-size: 11px;
  line-height: 1.55;
}

.agent-reply-text :deep(.markdown-body p),
.agent-reply-text :deep(.markdown-body li),
.agent-reply-text :deep(.markdown-body td),
.agent-reply-text :deep(.markdown-body th) {
  font-size: 11px;
}

.agent-reply-text :deep(pre),
.agent-reply-text :deep(code) {
  font-size: 10px;
}
</style>
