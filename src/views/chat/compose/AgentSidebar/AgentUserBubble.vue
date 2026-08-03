<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { NInput } from 'naive-ui'

const props = defineProps<{
  text: string
}>()

const isEditing = ref(false)
const draft = ref(props.text)
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

watch(
  () => props.text,
  (value) => {
    if (!isEditing.value)
      draft.value = value
  },
)

async function openEditor() {
  isEditing.value = true
  draft.value = props.text
  await nextTick()
  inputRef.value?.focus()
}

function closeEditor() {
  isEditing.value = false
  draft.value = props.text
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape')
    closeEditor()
}
</script>

<template>
  <div class="w-full">
    <button
      v-if="!isEditing"
      type="button"
      class="agent-user-preview w-full cursor-text rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs leading-relaxed text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
      @click="openEditor"
    >
      <span class="line-clamp-6 whitespace-pre-wrap break-words">{{ text }}</span>
    </button>

    <NInput
      v-else
      ref="inputRef"
      v-model:value="draft"
      type="textarea"
      class="agent-user-editor"
      :autosize="{ minRows: 2, maxRows: 12 }"
      @blur="closeEditor"
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.agent-user-editor :deep(.n-input-wrapper) {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.625;
}
</style>
